import { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } from 'constants';
import * as soap from 'soap';
import util from 'util';
import xml2js from 'xml2js';
import * as Limsml from './Limsml';

const LiveSchemaGuid = "4195E9A3-AF94-4969-A16E-6FCF9F252858";

export type Fields = Limsml.FieldsNode;
export enum ResponseType {
    System = "system",
    Data = "data"
}

export class Action {
    readonly command: string;
    readonly responseType: ResponseType;
    readonly parameters: Array<string>;

    constructor(command: string, responseType?: ResponseType, parameters?: Array<string>) {
        this.command = command.toLowerCase();
        this.responseType = responseType ?? ResponseType.System;
        this.parameters = (parameters ?? [ ]).map(p => p.toLowerCase());
    }

    addParameter(parameter: string): void {
        this.parameters.push(parameter.toLowerCase());
    }

    createNode(parameters: { [key: string]: string | number | boolean }): Limsml.ActionNode {
        const node: Limsml.ActionNode = {
            command: this.command,
            parameters: { }
        };

        if (this.parameters.length > 0) {
            this.parameters.forEach(p => {
                if (Object.keys(parameters).includes(p)) {
                    node.parameters[p] = parameters[p];
                }
            });
        } else {
            Object.keys(parameters).forEach(p => {
                node.parameters[p] = parameters[p];
            });
        }

        return node;
    }
}

class EntityDefinition {
    readonly type: string;
    readonly actions: { [key: string]: Action };

    constructor(type: string, actions?: Action | Array<Action>) {
        this.type = type.toLowerCase();
        this.actions = { };
        if (actions) {
            (actions instanceof Action ? [actions] : actions).forEach(a => {
                this.actions[a.command] = a;
            });
        }
    }

    addAction(action: Action): void {
        this.actions[action.command] = action;
    }

    createEntity(
        options: {
            action?: string | Action,
            parameters?: { [key: string]: string | number | boolean },
            fields?: Fields,
            children?: Array<Entity>
        }
    ): Entity {
        let action = undefined;
        if (options?.action) {
            if (options.action instanceof Action) {
                action = options.action;
            } else if (Object.keys(this.actions).includes(options.action)) {
                action = this.actions[options.action];
            } else {
                throw new Error(`Action ${action} not found on entity ${this.type}.`);
            }
        }

        return new Entity(this.type,
            {
                action,
                parameters: options?.parameters,
                fields: options?.fields,
                children: options?.children
            }
        );
    }
}

export class Entity {
    readonly type: string;
    readonly action?: Action;
    readonly parameters: { [key: string]: string | number | boolean };
    readonly fields: Fields;
    readonly children: Array<Entity>;

    constructor(
        type: string,
        options?: {
            action?: Action,
            parameters?: { [key: string]: string | number | boolean },
            fields?: Fields,
            children?: Array<Entity>
        }
    ) {

        this.type = type;
        this.action = options?.action;
        this.parameters = options?.parameters ?? { };
        this.fields = options?.fields ?? { };
        this.children = options?.children ?? [ ];
    }

    addField(id: string, field: { value: string | number | boolean, [attribute: string]: string | number | boolean }): void {
        this.fields[id] = field;
    }

    addChild(child: Entity): void {
        this.children.push(child);
    }

    addParameter(key: string, value: string | number | boolean): void {
        this.parameters[key] = value;
    }

    createNode(): Limsml.EntityNode {
        return new Limsml.EntityNode(this.type,
            {
                action: this.action?.createNode(this.parameters ?? { }),
                fields: this.fields,
                children: this.children.map(e => e.createNode())
            }
        );
    }
}

export class Transaction {
    readonly entity: Entity;

    constructor(entity: Entity) {
        this.entity = entity;
    }

    createNode(): Limsml.TransactionNode {
        return Limsml.CreateTransaction(this.entity.action?.responseType ?? ResponseType.System, this.entity.createNode());
    }
}

export type DataTable = Limsml.DataTable;
export type Response = {
    [key: string]: string | boolean | DataTable;
}

export class Client {
    readonly username: string;
    protected readonly password: string;
    session?: string;
    protected readonly client: soap.Client;
    readonly entities: { [key: string]: EntityDefinition };
    readonly debug: boolean;
    readonly unsafe: boolean;

    static async create(username: string, password: string, url: string, options?: { debug?: boolean, unsafe?: boolean }): Promise<Client> {
        const client = new Client(username, password, await soap.createClientAsync(url), options);
        await client.login();
        return client;
    }

    protected constructor(username: string, password: string, client: soap.Client, options?: { debug?: boolean, unsafe?: boolean }) {
        this.username = username;
        this.password = password;
        this.client = client;
        this.entities = { };
        this.debug = options?.debug ?? false;
        this.unsafe = options?.unsafe ?? false;
    }

    private async process(request: Limsml.Request): Promise<Limsml.ResponseNode> {
        if (this.debug) {
            console.log("process(): sent XML =")
            console.log(`    ${request.getXml({ pretty: true, prefix: "    " })}`);
        }

        const rawResult = await this.client.ProcessAsync({ request: request.getXml() });
        const resultObj = await xml2js.parseStringPromise(rawResult[0].ProcessResult);

        const builder = new xml2js.Builder({ renderOpts: { pretty: true }});
        if (this.debug) {
            console.log("process(): received XML =");
            console.log(builder.buildObject(resultObj).replace(/^/gm, "    "));
        }

        return Limsml.ParseResponse(resultObj);
    }

    async execute(transaction: Transaction): Promise<Response>;
    async execute(transactions: Array<Transaction>): Promise<Response>;
    async execute(entity: Entity): Promise<Response>;
    async execute(entityType: string, options?: {
        action?: string | Action,
        responseType?: ResponseType,
        parameters?: { [key: string]: string | number | boolean },
        fields?: Fields,
        children?: Array<Entity>
    }): Promise<Response>;
    async execute(entityType: string, options?: {
        action: string,
        responseType?: ResponseType,
        [parameter: string]: string | number | boolean | undefined
    }): Promise<Response>;

    async execute(executable: any, options?: any): Promise<Response> {
        if (!this.session) {
            await this.login();
        }

        let transactions: Array<Transaction> = [ ];
        if (typeof executable === "string") {
            const entity = executable;
            let action: Action | undefined = undefined;
            if (options?.action) {
                if (this.unsafe) {
                    if (options.action instanceof Action) {
                        action = options.action
                    } else {
                        action = new Action(options.action, options.responseType);
                    }
                } else {
                    if (Object.keys(this.entities).includes(entity)) {
                        if (options.action instanceof Action) {
                            action = options.action;
                        } else if (Object.keys(this.entities[entity].actions).includes(options.action)) {
                            action = this.entities[entity].actions[options.action];
                        } else {
                            throw new Error(`Action ${options.action} on entity ${entity} not recognized.`);
                        }
                    } else {
                        throw new Error(`Entity ${entity} not recognized.`);
                    }
                }
            }

            let parameters: { [key: string]: string } = { };
            const paramFilter = (p: string) => ![ "action", "responseType", "fields", "children" ].includes(p);
            if (options?.parameters) {
                parameters = options.parameters;
            } else {
                if (this.unsafe) {
                    Object.keys(options).filter(paramFilter).forEach(p => {
                        parameters[p] = options[p];
                    });
                } else if (action?.parameters && action.parameters.length > 0) {
                    action.parameters.filter(paramFilter).forEach(p => {
                        if (Object.keys(options).includes(p)) {
                            parameters[p] = options[p];
                        }
                    });
                }
            }

            transactions = [ new Transaction(new Entity(entity,
                {
                    action: action,
                    parameters: parameters,
                    fields: options?.fields,
                    children: options?.children
                }
            )) ];
        } else if (executable instanceof Transaction) {
            transactions = [ executable ];
        } else if (executable instanceof Entity) {
            transactions = [ new Transaction(executable) ];
        } else {
            transactions = executable;
        }

        const data = await this.executeTransaction(transactions.map(t => t.createNode()));
        const response = { } as Response;
        if (data.errors.length > 0) {
            response.error = data.errors.map(e => e.toString()).join(";");
        }

        data.body.forEach(b => {
            if (b instanceof Limsml.SystemResponse) {
                response[b.command.toLowerCase()] = b.data;
            } else if (b instanceof Limsml.DataResponse) {
                Object.keys(b.data).forEach(t => {
                    response[t] = b.data[t];
                });
            }
        });

        return response;
    }

    async login(): Promise<boolean> {

        const loginTransactions = [ ] as Array<Limsml.TransactionNode>;

        const actionsTableName = "limsml_entity_action";
        const paramsTableName = "limsml_entity_param";
        const schemaLayoutsTableName = "schema_layout";
        const schemaTablesTableName = "schema_table";
        const schemaViewsTableName = "schema_view";

        if (this.unsafe) {
            loginTransactions.push(new Transaction(new Entity("system",
                {
                    action: new Action("ping"),
                    parameters: { message: "nocheck" }
                }
            )).createNode());
        } else {
            const findAction = new Action("find", ResponseType.Data);
            const findParameters = { pagesize: 10000, schema: true };
            const searchAction = new Action("search", ResponseType.Data);
            const searchParameters = { pagesize: 10000, browse_only: false, filter_1_property: "SCHEMA_GUID", filter_1_operator: "=", filter_1_value: LiveSchemaGuid, filter_2_predicate: "AND", filter_2_property: "ACTIVE", filter_2_operator: "=", filter_2_value: true };

            [actionsTableName, paramsTableName].forEach(t => {
                loginTransactions.push(new Transaction(new Entity(t, { action: findAction, parameters: findParameters })).createNode());
            });

            [schemaLayoutsTableName, schemaTablesTableName, schemaViewsTableName].forEach(t => {
                loginTransactions.push(new Transaction(new Entity(t, { action: searchAction, parameters: searchParameters})).createNode());
            });
        }

        const startSession = Limsml.StartSession(this.username, this.password, loginTransactions);

        if (this.debug) console.log(`login(): logging in as user ${this.username}`);
        const loginResponse = await this.process(startSession);

        if (this.debug) console.log("login(): processing login response");
        if (loginResponse.parameters.session) {
            this.session = loginResponse.parameters.session;

            if (loginResponse.body[0].type === Limsml.ResponseType.Data) {
                this.session = loginResponse.parameters.session;
                const responses = <Array<Limsml.DataResponse>>loginResponse.body;

                // assemble known LIMSML entity actions
                const limsmlActions = responses.find(r => Object.keys(r.data).includes(actionsTableName))?.data[actionsTableName].table ?? [];
                const limsmlParams = responses.find(r => Object.keys(r.data).includes(paramsTableName))?.data[paramsTableName].table ?? [];
                limsmlActions.forEach(a => {

                    // add entity if it doesn't exist already
                    if (!Object.keys(this.entities).includes(a.entity.toLowerCase())) {
                        this.entities[a.entity.toLowerCase()] = new EntityDefinition(a.entity);
                    }

                    // create action
                    let action = new Action(a.action, a.return_type.toLowerCase() === "system" ? ResponseType.System : ResponseType.Data);

                    // add action parameters
                    limsmlParams.filter(p => p.entity === a.entity && p.action === a.action).forEach(p => {
                        action.addParameter(p.parameter);
                    });

                    // add action to entity
                    this.entities[a.entity.toLowerCase()].addAction(action);

                });

                // get complete list of entities and add generic actions
                if (Object.keys(this.entities).includes("generic")) {
                    const genericEntity = this.entities["generic"];
                    const schemaVersion = (responses.find(r => Object.keys(r.data).includes(schemaLayoutsTableName))?.data[schemaLayoutsTableName].table ?? [])
                        .map(s => s.schema_version)
                        .reduce((p, c) => c > (p ?? 0) ? c : p)
                        .toString();
                    const schemaEntities = (responses.find(r => Object.keys(r.data).includes(schemaTablesTableName))?.data[schemaTablesTableName].table ?? [])
                        .concat((responses.find(r => Object.keys(r.data).includes(schemaViewsTableName))?.data[schemaViewsTableName].table ?? []))
                        .filter(e => e.schema_version === schemaVersion)
                        .map(e => e.identity.toLowerCase());
                    schemaEntities.sort();
                    schemaEntities.forEach(e => {
                        if (!Object.keys(this.entities).includes(e)) {
                            this.entities[e] = new EntityDefinition(e);
                        }

                        Object.keys(genericEntity.actions).forEach(a => {
                            if (!Object.keys(this.entities[e].actions).includes(a)) {
                                this.entities[e].addAction(new Action(genericEntity.actions[a].command, genericEntity.actions[a].responseType, genericEntity.actions[a].parameters));
                            }
                        });
                    });
                } 
            }
        } else if (loginResponse.errors.length > 0) {
            throw new Error(loginResponse.errors.map(e => e.toString()).join(", "));
        } else {
            throw new Error("login response did not include session parameter");
        }

        if (this.debug) console.log(`login(): using session "${this.session}"`);
        return true;
    }

    async logout(): Promise<void> {
        if (this.session) {
            const endSession = Limsml.EndSession(this.username, this.session);
            if (this.debug) console.log("logout(): sending logout request");
            return this.process(endSession).then(() => {
                if (this.debug) console.log("logout(): logout successful");
            }).catch(reason => {
                if (this.debug) console.log(`logout(): logout failed: ${reason}`);
            });
        } else {
            if (this.debug) console.log("logout(): not logged in to begin with");
            return new Promise<void>(resolve => { resolve(); });
        }
    }

    private async executeTransaction(transaction: Limsml.TransactionNode | Array<Limsml.TransactionNode>): Promise<Limsml.ResponseNode> {
        if (this.session || await this.login()) {
            if (transaction instanceof Array) {
                if (this.debug) console.log(`execute(): command${transaction.length == 1 ? "" : "s"} = ${transaction.map(t => t.getCommand())}`);
            } else {
                if (this.debug) console.log(`execute(): command = ${transaction.getCommand()}`);
            }
            return this.process(Limsml.ContinueSession(this.username, this.session ?? "", transaction))
        } else {
            throw new Error("Could not log in");
        }
    }

    async ping(message: string): Promise<Limsml.ResponseNode> {
        return this.executeTransaction(new Limsml.TransactionNode(
            new Limsml.SystemNode("system",
                new Limsml.EntityNode("system",
                    { action: { command: "ping", parameters: { message } } }
                )
            )
        ));
    }
}
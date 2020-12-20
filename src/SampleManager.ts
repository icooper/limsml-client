import * as soap from 'soap';
import util from 'util';
import xml2js from 'xml2js';
import * as Limsml from './Limsml';

export class Client {
    readonly username: string;
    protected readonly password: string;
    protected session?: string;
    protected readonly client: soap.Client;
    protected actions: Array<any>;

    static async create(username: string, password: string, url: string): Promise<Client> {
        return soap.createClientAsync(url).then(client => new Client(username, password, client));     
    }

    protected constructor(username: string, password: string, client: soap.Client) {
        this.username = username;
        this.password = password;
        this.client = client;
        this.actions = [ ] as Array<any>;
    }

    private static async parseResult(result: any): Promise<Limsml.Response> {
        return xml2js.parseStringPromise(result[0].ProcessResult).then(resultObj => {
            return Limsml.ParseResponse(resultObj);
        });
    }

    private async process(request: Limsml.Request): Promise<Limsml.Response> {
        return this.client.ProcessAsync({ request: request.getXml() }).then((result: any) => Client.parseResult(result));
    }

    async login(): Promise<boolean> {
        const findAction = { action: { command: "find", parameters: { page: 1, pageSize: 10000, schema: true } } };
        const actionsTableName = "limsml_entity_action";
        const actionsTransaction = new Limsml.Transaction(new Limsml.System("data", new Limsml.Entity(actionsTableName, findAction)));
        const paramsTableName = "limsml_entity_param";
        const paramsTransaction = new Limsml.Transaction(new Limsml.System("data", new Limsml.Entity(paramsTableName, findAction)));
        const startSession = Limsml.StartSession(this.username, this.password, [ actionsTransaction, paramsTransaction ]);

        console.log(`login(): logging in as user ${this.username}`);
        const loginResponse = await this.process(startSession);

        console.log("login(): processing login response");
        if (loginResponse.parameters.session && loginResponse.body[0].type === Limsml.ResponseType.Data) {
            this.session = loginResponse.parameters.session;
            const responses = <Array<Limsml.DataResponse>>loginResponse.body;
            const limsmlActions = responses.find(r => Object.keys(r.data).includes(actionsTableName))?.data[actionsTableName].table ?? [];
            const limsmlParams = responses.find(r => Object.keys(r.data).includes(paramsTableName))?.data[paramsTableName].table ?? [];

            /*
            limsmlActions.forEach(a => {
                console.log(`${a.entity}\t${a.action}`);
                limsmlParams.filter(p => p.entity === a.entity && p.action === a.action).forEach(p => {
                    console.log(`    ${p.parameter}: ${p.description} ${(p.is_mandatory ? "(MANDATORY)" : "")}`);
                });
            });
            */

        } else if (loginResponse.errors.length > 0) {
            throw new Error(loginResponse.errors.map(e => e.toString()).join(", "));
        } else {
            throw new Error("login response did not include session parameter");
        }

        console.log(`login(): using session "${this.session}"`);
        return true;
    }

    async logout(): Promise<void> {
        if (this.session) {
            const endSession = Limsml.EndSession(this.username, this.session);
            console.log("logout(): sending logout request");
            return this.process(endSession).then(() => {
                console.log("logout(): logout successful");
            }).catch(reason => {
                console.log(`logout(): logout failed: ${reason}`);
            });
        } else {
            console.log("logout(): not logged in to begin with");
            return new Promise<void>(resolve => { resolve(); });
        }
    }

    private async execute(transaction: Limsml.Transaction | Array<Limsml.Transaction>): Promise<any> {
        if (this.session || await this.login()) {
            if (transaction instanceof Array) {
                console.log(`execute(): commands = [${transaction.map(t => t.getCommand())}]`);
            } else {
                console.log(`execute(): command = ${transaction.getCommand()}`);
            }
            return this.process(Limsml.ContinueSession(this.username, this.session ?? "", transaction))
        } else {
            throw new Error("Could not log in");
        }
    }

    async ping(message: string): Promise<Limsml.Response> {
        return this.execute(new Limsml.Transaction(
            new Limsml.System("system",
                new Limsml.Entity("system",
                    { action: { command: "ping", parameters: { message } } }
                )
            )
        ));
    }
}
import crypto from 'crypto';
import util from 'util';
import xml2js from 'xml2js';

type Header = {
    username: string,
    password?: string,
    session?: string,
    connect?: ConnectionType
}

type Action = {
    command: string,
    parameters?: { [key: string]: string | number | boolean }
}

type Field = {
    id: string,
    value: string,
    attributes?: { [key: string]: string | number | boolean }
}

export enum ConnectionType {
    StartSession = "StartSession",
    ContinueSession = "ContinueSession",
    EndSession = "EndSession",
    Proxy = "Proxy"
}

abstract class LimsmlBase {
    protected readonly tag: string;

    protected constructor (tag: string) {
        this.tag = tag;
    }

    abstract getData(root: boolean): any;
    getXml(options: { pretty?: boolean, headless?: boolean, prefix?: string } = { }): string {
        const builder = new xml2js.Builder({
            headless: options.headless ?? false,
            renderOpts: { pretty: options.pretty ?? false },
            xmldec: { version: "1.0", encoding: "utf-8" },
        });

        const data: any = { };
        data[this.tag] = this.getData(!(options.headless ?? false));

        let xml = builder.buildObject(data);
        xml = xml.replace(/<(\w+)\/>/g, (_, tag) => `<${tag} />`);
        if (options.prefix) {
            xml = xml.replace(/^/gm, options.prefix).substr(options.prefix.length);
        }

        return xml;
    }
}

export class Request extends LimsmlBase {
    private readonly xmlnsXsd = "http://www.w3.org/2001/XMLSchema";
    private readonly xmlnsXsi = "http://www.w3.org/2001/XMLSchema-instance";
    private readonly xmlns: string = "http://www.thermo.com/informatics/xmlns/limsml/1.0";
    private readonly header: Header;
    readonly transactions: Array<Transaction>;

    constructor(header: Header, transactions: Transaction | Array<Transaction>, ) {
        super("limsml");
        this.header = {
            username: header.username,
            password: header.password,
            session: header.session,
            connect: header.connect ?? ConnectionType.StartSession
        }
        this.transactions = transactions instanceof Transaction ? [ transactions ] : transactions;
    }

    private static createKey(input: string): Buffer {

        const poly = 79764919; // nonstandard
        const data = Buffer.from(input, "ascii");

        let crc = -1;
        for (let i = 0, l = data.length; i < l; i += 1) {
            let temp = (crc ^ data[i]) & 0xff;
            for (let j = 0; j < 8; j += 1) {
                if ((temp & 1) === 1) {
                    temp = (temp >>> 1) ^ poly;
                } else {
                    temp = (temp >>> 1);
                }
            }
            crc = (crc >>> 8) ^ temp;
        }
        crc ^= -1;

        const crcText = [
            (crc >> 24 & 0xff),
            (crc >> 16 & 0xff),
            (crc >> 8 & 0xff),
            (crc & 0xff)
        ].map((n: number) => (n < 16 ? "0" : "") + n.toString(16)).join("-").toUpperCase();
        const key = crypto.createHash("md5").update(crcText).digest();
        for (let i = 5; i < 16; i++) key[i] = 0;

        return key;
    }

    private static encrypt(key: Buffer, plaintext?: string): string {

        let ciphertext = "";

        if (plaintext && plaintext.length > 0) {
            const cipher = crypto.createCipheriv("rc4", key, null);
            ciphertext = cipher.update(plaintext, "utf16le", "hex");
            ciphertext += cipher.final("hex");
        }

        // return ciphertext
        return ciphertext;
    }

    getData(root: boolean = true): any {

        if (this.header.password !== undefined && this.header.password.length < 10) {
            this.header.password = `${this.header.password}          `.substr(0, 10);
        }

        const key = Request.createKey(this.transactions.map(t => t.getXml()).join(""));
        const encryptedUsername = Request.encrypt(key, this.header.username);
        const encryptedPassword = Request.encrypt(key, this.header.password);
        const encryptedSession = Request.encrypt(key, this.header.session);

        let data: any = {
            $: { },
            header: [
                {
                    parameter: [
                        { $: { name: "USER" }, _: encryptedUsername }
                    ]
                }
            ],
            body: [
                {
                    transaction: this.transactions.map(t => t.getData(false))
                }
            ]
        };

        if (root) {
            data.$["xmlns:xsd"] = this.xmlnsXsd;
            data.$["xmlns:xsi"] = this.xmlnsXsi;
            data.$["xmlns"] = this.xmlns;
        }

        switch (this.header.connect) {
            case ConnectionType.StartSession:
                data.header[0].parameter.push({ $: { name: "PASSWORD" }, _: encryptedPassword });
                data.header[0].parameter.push({ $: { name: "CONNECT" }, _: this.header.connect });
                break;
        
            case ConnectionType.ContinueSession:
            case ConnectionType.EndSession:
                data.header[0].parameter.push({ $: { name: "SESSION" }, _: encryptedSession });
                data.header[0].parameter.push({ $: { name: "CONNECT" }, _: this.header.connect });
                break;

            case ConnectionType.Proxy:
                data.header[0].parameter.push({ $: { name: "CONNECT" }, _: this.header.connect });
                break;

            default:
                break;
        }

        return data;
    }
}

export class Transaction extends LimsmlBase {
    readonly system: System;
    private readonly xmlnsXsd = "http://www.w3.org/2001/XMLSchema";
    private readonly xmlnsXsi = "http://www.w3.org/2001/XMLSchema-instance";

    constructor(system: System, attributes?: { [key: string]: string }) {
        super("transaction");
        this.system = system;
    }

    getData(root: boolean = false): any {
        let data: any = {
            $: { },
            system: [ this.system.getData(root) ]
        };

        if (root) {
            data.$["xmlns:xsd"] = this.xmlnsXsd;
            data.$["xmlns:xsi"] = this.xmlnsXsi;
        }

        return data;
    }

    getCommand(): string {
        return `${this.system.entity.type}.${this.system.entity.action?.command ?? ""}`;
    }
}

export class System extends LimsmlBase {
    readonly responseType: string;
    readonly entity: Entity;
    private readonly xmlns: string = "http://www.thermo.com/informatics/xmlns/limsml/1.0";

    constructor(responseType: "system" | "data", entity: Entity) {
        super("system");
        this.responseType = responseType;
        this.entity = entity;
    }

    getData(root: boolean = false): any {
        let data: any = {
            $: {
                response_type: this.responseType
            },
            entity: [ this.entity.getData(false) ]
        };

        if (root) {
            data.$["xmlns"] = this.xmlns;
        }

        return data;
    }
}

export class Entity extends LimsmlBase {

    readonly type: string;
    readonly action?: Action;
    readonly fields: Array<Field>;
    readonly children: Array<Entity>;

    constructor(type: string, options?: { action?: Action, fields?: Array<Field>, children?: Array<Entity> }) {
        super("entity");
        this.type = type;
        this.action = options ? options.action ?? undefined : undefined;
        this.fields = options ? options.fields ?? [ ] : [ ];
        this.children = options ? options.children ?? [ ] : [ ];
    }

    getData(root: boolean = false): any {
        let actions: Array<any> = [ '' ];
        if (this.action) {
            const actionData: any = {
                command: [ this.action.command.toUpperCase() ]
            };
            if (this.action.parameters && Object.keys(this.action.parameters).length > 0) {
                actionData.parameter = [ ];
                Object.keys(this.action.parameters).forEach(param => {
                    let paramValue = (this.action?.parameters ?? { })[param];
                    if (typeof paramValue === "boolean") {
                        paramValue = paramValue ? "True" : "False";
                    }
                    actionData.parameter.push({
                        _: paramValue,
                        $: { name: param.toUpperCase() }
                    });
                });
            }
            actions = [ { action: [ actionData ] } ];
        }

        let fields: Array<any> = [ '' ];
        if (this.fields.length > 0) {
            fields = [ { field: this.fields.map(f => {
                let fieldData: any = { 
                    _: f.value,
                    $: { id: f.id.toUpperCase() }
                };

                if (f.attributes) {
                    Object.keys(f.attributes).forEach(attr => {
                        fieldData.$[attr] = (f.attributes ?? { })[attr];
                    });
                }

                return fieldData;
            }) } ];
        }

        let children: Array<any> = root ? [ ] : [ '' ];
        if (this.children.length > 0) {
            children = [ { entity: this.children.map(c => c.getData(true)) } ];
        }

        let data: any = {
            $: { type: this.type.toUpperCase() },
            actions, fields, children
        }

        return data;
    }
}

export type Response = {
    parameters: {
        session?: string
    },
    body: Array<ResponseBody>,
    errors: Array<ResponseError>,
    raw?: any
}

export enum ResponseType {
    System = "system",
    Data = "data"
}

export type DataColumn = {
    name: string,
    caption: string,
    type: string
}

export type DataTable = {
    columns: Array<DataColumn>,
    rows: number,
    table: Array<any>
}

export abstract class ResponseBody {
    readonly type: ResponseType;
    readonly data: string | { [key: string]: DataTable } | undefined;

    constructor(type: ResponseType) {
        this.type = type;
    }
}

export class SystemResponse extends ResponseBody {
    readonly data: string;
    readonly command: string;

    constructor(responseObj: any) {
        super(ResponseType.System);
        this.data = responseObj.entity[0].fields[0].field.find((f: any) => f.$.id === "RETURN")._;
        this.command = responseObj.entity[0].actions[0].action[0].command[0];
    }
}

export class DataResponse extends ResponseBody {
    readonly data: { [key: string]: DataTable };

    constructor(responseObj: any) {
        super(ResponseType.Data);

        this.data = { };

        // parse schema
        const schema = responseObj.ADODataSet[0].NewDataSet[0]["xs:schema"][0]["xs:element"][0]["xs:complexType"][0]["xs:choice"][0]["xs:element"];
        schema.forEach((t: any) => {
            this.data[t.$.name.toLowerCase()] = {
                columns: t["xs:complexType"][0]["xs:sequence"][0]["xs:element"].map((c: any) => {
                    return {
                        name: c.$.name,
                        caption: c.$["msdata:Caption"],
                        type: c.$.type.substr(3)
                    };
                }),
                rows: 0,
                table: [] as Array<any>
            };
        });

        // add data
        Object.keys(this.data).forEach(t => {
            const table = responseObj.ADODataSet[0].NewDataSet[0][t.toUpperCase()];
            this.data[t].rows = table.length;
            table.forEach((e: any) => {
                const row: any = { };
                this.data[t].columns.forEach(c => {
                    const key = c.name.toLowerCase();
                    let value = (e[c.name] ?? [ undefined ])[0];
                    switch (c.type) {
                        case "boolean":
                            row[key] = value.toLowerCase() === "true";
                            break;

                        default:
                            row[key] = value;
                            break;
                    }
                });
                this.data[t].table.push(row);
            });
        });
    }
}

export class ResponseError {
    readonly summary: string;
    readonly description: string;
    readonly code: string;
    readonly severity: string;
    readonly source: string;
    // readonly errors: Array<Error>;

    constructor(errorObj: any) {
        this.summary = errorObj.summary[0];
        this.description = errorObj.description[0];
        this.code = errorObj.code[0];
        this.severity = errorObj.severity[0];
        this.source = errorObj.source[0];
        // this.errors = [];
    }

    toString(): string {
        return `${this.summary} (${this.code})`;
    }
}

export function ParseResponse(obj: any): Response {
    const response = {
        parameters: { } as { [key: string]: string },
        body: [ ] as Array<ResponseBody>,
        errors: [ ] as Array<ResponseError>,
        raw: obj
    }

    // parse parameters
    if (obj.limsml?.header[0]?.parameter) {
        obj.limsml.header[0].parameter.forEach((p: any) => {
            response.parameters[p.$.name.toLowerCase()] = p._;
        });
    }

    // parse body
    if (obj.limsml?.body[0]?.transaction) {
        obj.limsml.body[0].transaction.forEach((t: any) => {
            if (t.system) {
                response.body.push(new SystemResponse(t.system[0]));
            } else if (t.data) {
                response.body.push(new DataResponse(t.data[0]));
            }
        });
    }

    // parse errors
    if (obj.limsml?.errors[0]?.error) {
        obj.limsml.errors[0].error.forEach((e: any) => {
            response.errors.push(new ResponseError(e));
        });
    }

    return response;
}

export function StartSession(username: string, password: string = "", transaction?: Transaction | Array<Transaction>): Request {
    return new Request(
        {
            username,
            password,
            connect: ConnectionType.StartSession
        },
        transaction ?? new Transaction(
            new System("system",
                new Entity("system",
                    { action: { command: "login" } }
                )
            )
        )
    );
}

export function ContinueSession(username: string, session: string, transaction: Transaction | Array<Transaction>): Request {
    return new Request(
        {
            username,
            session,
            connect: ConnectionType.ContinueSession
        },
        transaction ?? new Transaction(
            new System("system",
                new Entity("system",
                    { action: { command: "ping", parameters: { message: "Are you still there?" } } }
                )
            )
        )
    );
}

export function EndSession(username: string, session: string, transaction?: Transaction | Array<Transaction>): Request {
    return new Request(
        {
            username,
            session,
            connect: ConnectionType.EndSession
        },
        transaction ?? new Transaction(
            new System("system",
                new Entity("system",
                    { action: { command: "logout" } }
                )
            )
        )
    );
}
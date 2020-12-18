import crypto from 'crypto';
import xml2js from 'xml2js';

type Header = {
    username: string,
    password?: string,
    session?: string,
    connect?: ConnectionType
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

        const key = crypto.createHash("md5").update([
            (crc >> 24 & 0xff).toString(16),
            (crc >> 16 & 0xff).toString(16),
            (crc >> 8 & 0xff).toString(16),
            (crc & 0xff).toString(16)
        ].join("-").toUpperCase()).digest();
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
            data["$"]["xmlns:xsd"] = this.xmlnsXsd;
            data["$"]["xmlns:xsi"] = this.xmlnsXsi;
            data["$"]["xmlns"] = this.xmlns;
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
            data["$"]["xmlns:xsd"] = this.xmlnsXsd;
            data["$"]["xmlns:xsi"] = this.xmlnsXsi;
        }

        return data;
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
            data["$"]["xmlns"] = this.xmlns;
        }

        return data;
    }
}

export class Entity extends LimsmlBase {

    private readonly type: string;
    private actions: Array<Action>;
    private fields: Array<Field>;
    private children: Array<Entity>;

    constructor(type: string, options?: { actions?: Array<Action>, fields?: Array<Field>, children?: Array<Entity> }) {
        super("entity");
        this.type = type.toUpperCase();
        this.actions = options ? options.actions ?? [ ] : [ ];
        this.fields = options ? options.fields ?? [ ] : [ ];
        this.children = options ? options.children ?? [ ] : [ ];
    }

    addAction(action: Action) {
        this.actions.push(action);
    }

    addField(field: Field) {
        this.fields.push(field);
    }

    addChild(child: Entity) {
        this.children.push(child);
    }

    getData(root: boolean = false): any {
        let data: any = {
            $: { type: this.type },
            actions: this.actions.length > 0 ? [ ] : [ '' ],
            fields: this.fields.length > 0 ? [ ] : [ '' ],
            children: this.children.length > 0 ? [ ] : [ '' ]
        }

        this.actions.forEach(action => data.actions.push(action.getData(false)));
        this.fields.forEach(field => data.actions.push(field.getData(false)));
        this.children.forEach(entity => data.actions.push(entity.getData(false)));
        return data;
    }
}

export class Action extends LimsmlBase {
    readonly command: string;
    private parameters: { [key: string]: string };

    constructor(command: string, parameters?: { [key: string]: string }) {
        super("action");
        this.command = command.toUpperCase();
        this.parameters = parameters ?? { };
    }

    setParameter(name: string, value: string) {
        this.parameters[name.toUpperCase()] = value;
    }

    getParameter(name: string): string {
        return this.parameters[name];
    }

    getData(root: boolean = false): any {
        let data: any = {
            action: [
                {
                    command: [ this.command ]
                }
            ]
        }

        const keys = Object.keys(this.parameters);
        if (keys.length > 0) {
            data.action[0]['parameter'] = Object.keys(this.parameters).map(key => {
                return {
                    _: this.parameters[key],
                    $: { name: key }
                };
            });
        }

        return data;
    }
}

export class Field extends LimsmlBase {
    readonly id: string;
    readonly value: string;
    private attributes: { [key: string]: string };

    constructor(id: string, value: string, attributes?: { [key: string]: string }) {
        super("field");
        this.id = id;
        this.value = value;
        this.attributes = attributes ?? { };
    }

    setAttribute(name: string, value: string) {
        this.attributes[name] = value;
    }

    getAttribute(name: string): string {
        return this.attributes[name];
    }

    getData(root: boolean = false): any {
        let data: any = {
            $: { id: this.id },
            _: this.value
        }

        Object.keys(this.attributes).forEach(key => {
            data["$"][key] = this.attributes[key];
        });

        return data;
    }
}

export function StartSession(username: string, password: string = ""): Request {
    return new Request(
        {
            username,
            password,
            connect: ConnectionType.StartSession
        },
        new Transaction(
            new System("system",
                new Entity("system",
                    { actions: [ new Action("ping", { message: "Hello" }) ] }
                )
            )
        )
    );
}

export function ContinueSession(username: string, session: string, transaction: Transaction | Array<Transaction>) {
    return new Request(
        {
            username,
            session,
            connect: ConnectionType.ContinueSession
        },
        transaction
    );
}

export function EndSession(username: string, session: string): Request {
    return new Request(
        {
            username,
            session,
            connect: ConnectionType.EndSession
        },
        new Transaction(
            new System("system",
                new Entity("system",
                    { actions: [ new Action("ping", { message: "Goodbye" }) ] }
                )
            )
        )
    );
}
import * as soap from 'soap';
import xml2js from 'xml2js';
import * as Limsml from './Limsml';

export class Server {
    readonly url: string;


    constructor(url: string) {
        this.url = url;
    }

    async start(username: string, password: string): Promise<Session> {
        let sessionClient: soap.Client;
        return soap.createClientAsync(this.url).then(client => {
            sessionClient = client;
            const login = Limsml.StartSession(username, password);
            return Session.process(login, client);
        }).then(result => {
            return xml2js.parseStringPromise(result[0]["ProcessResult"]);
        }).then(result => {
            const session = (result.limsml.header[0].parameter as Array<any>).find(x => x["$"].name === "SESSION")._;
            return new Session(username, session, sessionClient);
        });
    }
}

export class Session {
    readonly username: string;
    readonly session: string;
    readonly client: soap.Client;

    constructor(username: string, session: string, soap: soap.Client) {
        this.username = username;
        this.session = session;
        this.client = soap;
    }

    static async process(request: Limsml.Request, client: soap.Client): Promise<any> {
        return client.ProcessAsync({ request: request.getXml() });
    }

    private async process(request: Limsml.Request): Promise<any> {
        return Session.process(request, this.client);
    }

    private async execute(transaction: Limsml.Transaction): Promise<any> {
        const response = await this.process(Limsml.ContinueSession(this.username, this.session, transaction));
        const responseObj = await xml2js.parseStringPromise(response[0]["ProcessResult"]);
        return responseObj;
    }

    async getLoginMenu(): Promise<string> {
        const transaction = new Limsml.Transaction(
            new Limsml.System("data",
                new Limsml.Entity("user",
                    { actions: [ new Limsml.Action("login") ] }
                )
            )
        )

        return this.execute(transaction);
    }

    async end(): Promise<void> {
        return this.process(Limsml.EndSession(this.username, this.session));
    }
}
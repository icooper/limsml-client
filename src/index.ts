/**
 * A JavaScript client for the LIMSML web service used by the Thermo Fisher SampleManager LIMS application.
 * @author Ian Cooper
 * @module limsml-client
 */

//#region Imports

import * as base64 from 'base-64';
import convert from 'xml-js';
import CryptoJS from 'crypto-js';
import ent from 'ent';
import soapRequest from 'easy-soap-request';

//#endregion

//#region Constants

/**
 * The name of the generic entity
 */
const GenericEntity = "generic";

//#endregion

//#region Enums

/** Limsml connection types */
enum ConnectionType {
    StartSession = "StartSession",
    ContinueSession = "ContinueSession",
    EndSession = "EndSession",
    Proxy = "Proxy"
}
/** Entity field data types */
enum FieldDataTypes { Text = "Text" }
/** Entity field directions */
enum FieldDirections { In = "in", Out = "out" }
/** Limsml return types */
enum ResponseType { System = "system", Data = "data" }

//#endregion

//#region Types

/** Options for the Action constructor */
type ActionOptions = { allParameters?: string[], requiredParameters?: string[], validEntities?: string[] };
/** Contains information about a column of a data table */
type DataColumns = { [name: string]: { caption: string, type: string } };
/** Contains tabular data with column information */
type DataTable = { columns: DataColumns, rows: number, table: any[] };
/** Fields for an entity */
type Fields = { [id: string]: { value: any, [attribute: string]: any } | any };
/** Parameters for an action */
type Parameters = { [name: string]: any; }
/** LIMSML response data */
type ResponseData<T> = { [name: string]: T; }
/** LIMSML response data file */
type ResponseFile = { filename: string, data: string, text?: string };

// LIMSML Nodes

/** Used to represent a LIMSML <action> node */
type Action = { command: string; parameters?: Parameters; };
/** Used to represent a LIMSML <entity> node */
export type Entity = { type: string; action?: Action; fields?: Fields; children?: Entity[]; };
/** Used to represent a LIMSML <header> node */
type Header = { user: string, password?: string, session?: string, connect: ConnectionType };
/** Used to represent a LIMSML <system> node */
type System = { responseType: ResponseType; entity: Entity; }
/** Used to represent a LIMSML <transaction> node */
type Transaction = { system: System; }

//#endregion

//#region Classes

/**
 * Represents a LIMSML action definition.
 */
class ActionDefinition {

    /** Action command */
    readonly command: string;
    /** Action return type */
    readonly returnType: ResponseType;
    /** All possible action parameters */
    readonly allParameters: string[];
    /** Required action parameters */
    readonly requiredParameters: string[];
    /** Valid entities */
    readonly validEntities: string[];

    /**
     * Creates a new Action
     * @param command action command
     * @param returnType action response type (default = `"system"`)
     * @param options parameter list, required parameter list, valid entity type list
     */
    constructor(command: string, returnType: ResponseType = ResponseType.System, options?: ActionOptions) {
        this.command = command.toLowerCase();
        this.returnType = returnType;
        this.allParameters = (options?.allParameters ?? [ ]).map(p => p.toLowerCase());
        this.requiredParameters = (options?.requiredParameters ?? [ ]).map(r => r.toLowerCase());
        this.validEntities = (options?.validEntities ?? [ ]).map(e => e.toLowerCase());
    }

    /**
     * Creates a transaction that a client instance can execute.
     * @param parameters action parameters
     * @param entity entity type or Entity (default = `"system"`)
     * @returns Transaction
     */
    createTransaction(parameters?: Parameters, entity?: string | Entity): Transaction;

    /**
     * Creates a transaction that a client instance can execute.
     * @param entity entity type or Entity (default = `"system"`)
     * @returns Transaction
     */
    createTransaction(entity?: string | Entity): Transaction;
    
    createTransaction(arg1?: any, arg2?: any): Transaction {    
        
        // parse args
        const parsedArgs = ActionDefinition.parseArgs(arg1, arg2);
        const parameters = parsedArgs.parameters;
        const entity = parsedArgs.entity;

        // check that the entity and parameters are valid for this action
        if (this.validate(parameters ?? { }, entity)) {

            // create the Action
            const action: Action = {
                command: this.command
            }

            // add the parameters to the Action
            if (parameters) {
                const inputParams = <Parameters>parameters;
                const actionParams = { } as Parameters;

                // if this Action has defined parameters, then only add the defined parameters
                if (this.allParameters.length > 0) {
                    this.allParameters.forEach(p => {
                        if (Object.keys(inputParams).includes(p)) {
                            actionParams[p] = inputParams[p];
                        }
                    });
                }
                
                // otherwise just add them all
                else { 
                    Object.keys(parameters).forEach(p => {
                        actionParams[p] = inputParams[p];
                    });
                }   
                action.parameters = actionParams;
            }

            // assign the Action to the Entity
            entity.action = action;

            // return the Transaction (with inline System)
            return {
                system: {
                    responseType: this.returnType, entity
                }
            } as Transaction;
        } else {
            throw new Error(`Invalid parameters or entity specified for action ${this.command}.`);
        }
    }

    /**
     * Validate the entity and parameters for this action.
     * @param parameters parameters to be validated
     * @param entity entity type or Entity to be validated
     * @returns true if the entity and parameters are valid for this action
     */
    validate(parameters: Parameters, entity: string | Entity): boolean {

        // make sure that entity is just a string
        if (typeof entity !== "string") {
            entity = entity.type;
        }

        // check entity types
        let valid = this.validEntities.length === 0 || this.validEntities.includes(entity) || this.validEntities.includes(GenericEntity);

        // check required parameters
        this.requiredParameters.forEach(p => valid &&= Object.keys(parameters).includes(p));

        return valid;
    }

    /**
     * Parses the optional arguments used by `Action.createTransaction()`.
     * @param arg1 Parameters or Entity
     * @param arg2 Entity
     * @returns object with keys: `parameters`, `entity`
     */
    static parseArgs(arg1?: any, arg2?: any): { parameters?: Parameters, entity: Entity } {
        let parameters: Parameters | undefined, entity: Entity;

        if (arg2) {
            parameters = arg1;
            entity = typeof arg2 === "string" ? { type: arg2 } : arg2;
        } else if (typeof arg1 === "string") {
            entity = { type: arg1 };
        } else if (arg1.type) {
            entity = arg1;
        } else {
            parameters = arg1;
            entity = { type: "system" };
        }

        return { parameters, entity }
    }
}

/**
 * Client for communicating with a SampleManager server via the LIMSML protocol.
 * This should be instantiated using `Client.login()`.
 */
export class Client {

    /** Maximum size where base64-encoded received files are automatically decoded */
    static MAX_BASE64_DECODE: number = 524288;

    /** SampleManager username */
    readonly _username: string;
    /** SampleManager password */
    private readonly _password: string;
    /** LIMSML web service url (e.g. `http://localhost:56104/`) */
    readonly _url: string;
    /** LIMSML session number */
    _session?: string;
    /** debug mode flag */
    readonly _debug: boolean;
    /** list of valid actions; access via actions() function */
    protected _actions?: { [id: string]: ActionDefinition };
    /** dynamically-created Action methods */
    [method: string]: any;

    /**
     * Creates a new LIMSML client instance.
     * @param username SampleManager username
     * @param password SampleManager password
     * @param client SOAP client instance
     * @param debug debug flag
     */
    private constructor(username: string, password: string, url: string, debug?: boolean) {
        this._username = username;
        this._password = password;
        this._url = url;
        this._debug = debug ?? false;
    }

    /**
     * Gets information about known actions.
     * @param action action name
     * @returns list of matching actions
     */
    action(action: string): ActionDefinition[] {

        // convert the action command to lowercase
        action = action.toLowerCase();

        // return the list of matching actions
        return Object.values(this._actions ?? { }).filter(a => a.command === action);
    }

    /**
     * Executes a transaction created by an Action instance.
     * @param transaction Transaction to execute
     * @returns the response from the LIMSML server
     */
    protected async _execute(transaction: Transaction): Promise<Response>;

    /**
     * Executes an array of transactions created by an Action instance.
     * @param transactions array of Transactions to execute
     * @returns the response from the LIMSML server
     */
    protected async _execute(transactions: Transaction[]): Promise<Response>;

    protected async _execute(input: Transaction | Transaction[]): Promise<Response> {
        
        // make sure we're logged in
        if (this._session) {

            // handle the input as a single transaction or an array of transactions
            let transactions: Transaction[];

            // is the input already an array?
            if (Array.isArray(input)) {
                transactions = input;
            }
            
            // input must be a single transaction
            else { 
                transactions = [ input ];
            }

            // create a request for these transactions
            const request = new Request(this._getHeader(), transactions);

            // send the request and get the response
            const response = await this._process(request);

            // return the response
            return response;
        }
        
        // throw an error because we're not logged in
        else {
            throw new Error("Not logged in.");
        }
    }

    /**
     * Constructs the appropriate Header for the inferred or specified connection type.
     * @param type optional connection type
     * @returns Header with connection details
     */
    protected _getHeader(type?: ConnectionType): Header {

        // header should default to ContinueSession if we're logged in
        type ??= this._session ? ConnectionType.ContinueSession : ConnectionType.StartSession;

        // create the header with the username
        const header: any = {
            user: this._username
        };

        // add the password or session depending on connection type
        switch (type) {
            case ConnectionType.StartSession:
                header.password = this._password;
                break;

            case ConnectionType.ContinueSession:
            case ConnectionType.EndSession:
                header.session = this._session;
                break;
        }

        // add the connection type at the end
        header.connect = type;

        // return the header
        return header;
    }

    /**
     * Logs into the server. This is called by `Client.login()` and must be
     * completed before any other transactions can be executed.
     * @returns Promise of true if the login was successful
     */
    private async _login(): Promise<boolean> {

        // we're requesting the contents of these tables during login
        const actionsTable = "limsml_entity_action";
        const paramsTable = "limsml_entity_param";            

        // create the login transactions
        const transactions = [actionsTable, paramsTable]
            .map(t => new ActionDefinition("find", ResponseType.Data).createTransaction({ pagesize: 1000 }, t));

        // create the login request
        const request = new Request(this._getHeader(ConnectionType.StartSession), transactions);

        // send the login request
        if (this._debug) console.info(`login(): logging in as user ${this._username}`);
        const response = await this._process(request);

        // look for the session in the login response
        if (response.parameters.session) {

            // save the session
            this._session = response.parameters.session;
            if (this._debug) console.info(`login(): logged in with session ${this._session?.trim()}`);

            // get the LIMSML actions available if we don't already have a list
            if (!this._actions && response.data[actionsTable] && response.data[paramsTable]) {
                const actionsData = response.data[actionsTable];
                const paramsData = response.data[paramsTable];
                const registeredActions: { [action: string]: string } = { };
                if (this._debug) console.info("login(): reading available LIMSML actions");

                // make sure we don't overwrite any existing functions on this
                const thisFunctions = Object.keys(this);

                // create an action for each of the actions except ones that would override existing functions
                actionsData.table.filter(a => !thisFunctions.includes(a.action.toLowerCase())).forEach((a: any) => {
                    const allParameters: string[] = [ ];
                    const requiredParameters: string[] = [ ];

                    // iterate through each parameter relevant to that action
                    paramsData.table.filter(p => p.entity === a.entity && p.action === a.action).forEach((p: any) => {

                        // add the parameter to the parameter list
                        allParameters.push(p.parameter);

                        // is this parameter mandatory?
                        if (p.is_mandatory) {

                            // add the parameter to the mandatory parameter list
                            requiredParameters.push(p.parameter);
                        }
                    });

                    // create the action and register it with the client
                    const action = new ActionDefinition(a.action, a.return_type, { allParameters, requiredParameters, validEntities: [ a.entity ] });
                    const registerInfo = this._registerAction(a.entity.toLowerCase(), action);
                    if (this._debug) registeredActions[registerInfo.actionId] = registerInfo.actionFunc;
                });

                if (this._debug) console.info("login(): registered actions", registeredActions);

            }
        }


        return true;
    }

    async logout(): Promise<void> {

        // are we logged in?
        if (this._session) {

            // create the logout transaction
            const transaction = new ActionDefinition("logout", ResponseType.Data).createTransaction("user");

            // create the logout request
            const request = new Request(this._getHeader(ConnectionType.EndSession), transaction);

            // send the logout request
            const response = await this._process(request);

            // process the logout response
            if (response.errors.length === 0) {
                this._session = undefined;
            }
            if (this._debug) console.info(`logout(): ${response.errors.length === 0 ? "succeeded" : "failed"}`);
        }
        
        // if not, nothing to do
        else {
            if (this._debug) console.info("logout(): not logged in to begin with");
        }
    }

    /**
     * Sends a request to the LIMSML server and returns the response
     * @param request Request
     * @returns Response promise
     */
    protected async _process(request: Request): Promise<Response> {

        // log the request XML
        if (this._debug) {
            console.info("process(): sent XML", { xml: request.toXml(true) });
        }

        // make the request via the SOAP client
        const soapResponse = await soapRequest({
            url: this._url,
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                SOAPAction: "http://www.thermo.com/informatics/xmlns/limswebservice/Process"
            },
            xml: request.toSoapXml()
        });
        
        // throw an error if we didn't get a status code of 200 (OK)
        if (soapResponse.response.statusCode !== 200) {
            throw new Error(`SOAP request failed: response code = ${soapResponse.response.statusCode}`);
        }

        // extract the LIMSML response from the SOAP response
        const limsmlResponse = ent.decode(soapResponse.response.body.replace(/^.*<ProcessResult>(.+)<\/ProcessResult>.*$/i, '$1'));

        // parse the LIMSML response XML
        const responseObj = convert.xml2js(limsmlResponse, { compact: true });

        // parse the response XML object into a Response instance
        const response = new Response(responseObj);

        // log the response information
        if (this._debug) {
            // console.info("process(): received raw", responseObj);
            console.info("process(): received response", response);
        }

        // return the Response instance
        return response;
    }

    /**
     * Registers a LIMSML action with the client
     * @param entity entity name
     * @param action Action instance
     */
    protected _registerAction(entity: string, action: ActionDefinition): { actionId: string, actionFunc: string } {

        // create the actions list if it's undefined
        this._actions ??= { };

        // put together an action ID and function name
        const command = action.command;
        const actionId = [ entity, command ].join('.');
        const actionFunc = Utils.UnderscoreToCamelCase(command);

        // add the action to the actions list
        this._actions[actionId] = action;

        // create an action handler
        if (!this[actionFunc]) {
            this[actionFunc] = async function doAction(arg1: any, arg2: any): Promise<Response> {

                // make sure we have some actions defined
                if (this._actions) {
        
                    // parse args
                    const parsedArgs = ActionDefinition.parseArgs(arg1, arg2);
                    const parameters = parsedArgs.parameters;
                    const entity = parsedArgs.entity;
        
                    // find the right action to run
                    let actionId = undefined;
                    Object.keys(this._actions)
                        .filter(id => id === `${entity.type}.${command}`)
                        .forEach(id => actionId = id);
                    if (!actionId) {
                        Object.keys(this._actions)
                            .filter(id => id === `${GenericEntity}.${command}`)
                            .forEach(id => actionId = id);
                    }
        
                    // did we find an action?
                    if (actionId && this._actions[actionId]) {
                        
                        // create a transaction
                        const transaction = this._actions[actionId].createTransaction(parameters, entity);

                        // execute the transaction
                        const response = this._execute(transaction);

                        // return the response
                        return response;
                    }
                    
                    // return an error since we couldn't match an action
                    else {
                        throw new Error(`Could not find a registered action for ${entity.type}.${command}.`)
                    }
                }
        
                // return an error since the action list is empty
                else {
                    throw new Error("No actions registered.");
                }
            };
        }

        return { actionId, actionFunc }
    }

    /**
     * Creates a new client connection via LIMSML web service.
     * @param username SampleManager username (default = `"SYSTEM"`)
     * @param password SampleManager password (default = `""`)
     * @param url location to access LIMSML web service (default = `"http://localhost:56104/"`)
     * @param debug debug flag (default = `false`)
     */
    static async login(
        username: string = "SYSTEM",
        password: string = "",
        url: string = "http://localhost:56104/",
        debug: boolean = false
    ): Promise<Client> {
        const client = new Client(username, password, url, debug);
        await client._login();
        return client;
    }
}

/**
 * LIMSML request.
 */
class Request {

    /** Connection details */
    readonly header: Header;
    /** Transactions in the request */
    readonly transactions: Transaction[];

    /**
     * Create a LIMSML request with the specified transaction
     * @param header the connection details
     * @param transaction single Transaction
     */
    constructor(header: Header, transaction: Transaction);

    /**
     * Create a LIMSML request with the specified transactions
     * @param header the connection details
     * @param transactions array of Transactions
     */
    constructor(header: Header, transactions: Transaction[]);

    constructor(header: Header, transactions: any) {
        this.header = header;
        this.transactions = Array.isArray(transactions) ? transactions: [transactions];

        // encrypt the header information
        this.encryptHeader();
    }

    /**
     * Encrypts the header information
     */
    private encryptHeader(): void {
        const key = Utils.CreateKey(this.transactions.map(t => Utils.ObjectToXml(Utils.NodeToObject(t))).join(''));
        this.header.user = Utils.EncryptString(key, this.header.user);
        switch (this.header.connect) {
            case ConnectionType.StartSession:
                this.header.password ??= "";
                if (this.header.password.length < 10) {
                    this.header.password = `${this.header.password}          `.substr(0, 10);
                }
                this.header.password = Utils.EncryptString(key, this.header.password);
                break;

            case ConnectionType.ContinueSession:
            case ConnectionType.EndSession:
                this.header.session = Utils.EncryptString(key, this.header.session);
                break;
        }
    }
    
    /**
     * Returns the request as an XML object.
     * @returns object suitable for conversion to XML
     */
    toObject(): any {
        return Utils.NodeToObject(this);
    }

    /**
     * Returns the request as an XML string.
     * @returns XML string
     */
    toXml(pretty?: boolean): string {
        return Utils.ObjectToXml(this.toObject(), pretty);
    }

    /**
     * Returns the request as a SOAP XML request string.
     * @returns SOAP XML request string
     */
    toSoapXml(): string {
        return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><Process xmlns="http://www.thermo.com/informatics/xmlns/limswebservice"><request>${ent.encode(this.toXml())}</request></Process></s:Body></s:Envelope>`;
    }
}

/**
 * LIMSML response from the server.
 */
class Response {
    /** Parameters returned in the LIMSML response */
    readonly parameters: Parameters;
    /** Data returned in the LIMSML response */
    readonly data: ResponseData<DataTable>;
    /** System messages returned in the LIMSML response */
    readonly system: ResponseData<string>;
    /** Data files returned in the LIMSML response */
    readonly files: ResponseFile[];
    /** Error messages returned in the LIMSML response */
    readonly errors: string[];

    /** Create a new LIMSML response object.
     * @param response the LIMSML response XML object
     */
    constructor(response: any) {
        this.parameters = { };
        this.data = { };
        this.system = { };
        this.files = [ ];
        this.errors = [ ];

        // get the parameters
        if (response.limsml?.header?.parameter) {
            const params = response.limsml.header.parameter;

            // just one parameter or an array of parameters?
            if (Array.isArray(params)) {
                params.forEach(p => this.processParameter(p));
            } else {
                this.processParameter(params)
            }
        }

        // go through the transactions
        if (response.limsml?.body?.transaction) {
            const transaction = response.limsml.body.transaction;

            // just one transaction or an array of transactions?
            if (Array.isArray(transaction)) {
                transaction.forEach(t => this.processTransaction(t));
            } else {
                this.processTransaction(transaction);
            }
        }

        // go through the errors
        if (response.limsml?.errors?.error) {
            const error = response.limsml.errors.error;

            // just one error or an array of errors?
            if (Array.isArray(error)) {
                error.forEach(e => this.processError(e));
            } else {
                this.processError(error);
            }
        }
    }

    /**
     * Processes an error message in the LIMSML response XML object.
     * @param e error node
     */
    protected processError(e: any): void {
        
        // get the top-level error
        if (e.description?._text && e.code?._text) {
            this.errors.push(`${e.description._text} (${e.code._text})`);
        }

        // get any child errors
        if (e.errors?.error) {
            if (Array.isArray(e.errors?.error)) {
                e.errors.error.forEach(this.processError);
            } else {
                this.processError(e.errors.error);
            }
        }
    }

    /**
     * Processes a data file in the LIMSML response XML object.
     * @param f file node
     */
    protected processFile(f: any): void {
        const file: ResponseFile = {
            filename: f.filename._text,
            data: f.binary._text
        }

        if (file.data.length < Client.MAX_BASE64_DECODE) {
            file.text = base64.decode(file.data);
        }

        this.files.push(file);
    }

    /**
     * Processes a parameter node from the LIMSML response XML object.
     * @param p parameter node
     */
    protected processParameter(p: any): void {
        this.parameters[p._attributes.name.toLowerCase()] = p._text;
    }

    /**
     * Processes a dataset row in the LIMSML response XML object.
     * @param table table name
     * @param row row node
     */
    protected processRow(table: string, row: any): void {

        // create an object to hold the data for this row
        const rowData: any = { };

        // iterate through the columns
        Object.keys(row).forEach(c => {

            // normalize the column name
            const column = c.toLowerCase();

            // add the data to the row object
            rowData[column] = Utils.StringToValue(row[c]._text, this.data[table].columns[column].type);
        });

        // add the row to the datatable
        this.data[table].table.push(rowData);
    }

    /**
     * Processes a dataset schema in the LIMSML response XML object.
     * @param schema schema node
     */
    protected processSchema(schema: any): void {
        // create the entry in the data field
        if (schema._attributes?.name &&
            schema["xs:complexType"] &&
            schema["xs:complexType"]["xs:sequence"] &&
            schema["xs:complexType"]["xs:sequence"]["xs:element"]) {
            const table = schema._attributes.name.toLowerCase();
            const columns = schema["xs:complexType"]["xs:sequence"]["xs:element"];

            // create the datatable object
            this.data[table] = {
                columns: { } as DataColumns,
                rows: 0,
                table: [ ]
            } as DataTable;

            // add the column definitions
            columns.forEach((c: any) => {
                this.data[table].columns[c._attributes.name.toLowerCase()] = {
                    caption: c._attributes["msdata:Caption"],
                    type: c._attributes.type.substr(3)
                };
            });
        }
    }

    /**
     * Processes a transaction node from the LIMSML response XML object.
     * @param t transaction node
     */
    protected processTransaction(t: any): void {
        // is it a system transaction?
        if (t.system) {

            // look for a simple single returned value
            if (t.system.entity?.actions?.action?.command?._text &&
                t.system.entity?.fields?.field?._text) {
                this.system[t.system.entity.actions.action.command._text.toLowerCase()] = t.system.entity.fields.field._text;
            }
        }

        // is it a data transaction?
        else if (t.data) {

            // look for a dataset
            if (t.data.ADODataSet?.NewDataSet) {
                const dataset = t.data.ADODataSet.NewDataSet;

                // schema?
                if (dataset["xs:schema"] &&
                    dataset["xs:schema"]["xs:element"] &&
                    dataset["xs:schema"]["xs:element"]["xs:complexType"] &&
                    dataset["xs:schema"]["xs:element"]["xs:complexType"]["xs:choice"] &&
                    dataset["xs:schema"]["xs:element"]["xs:complexType"]["xs:choice"]["xs:element"]) {
                    const schema = dataset["xs:schema"]["xs:element"]["xs:complexType"]["xs:choice"]["xs:element"];

                    // does the schema contain just one or more than one table?
                    if (Array.isArray(schema)) {
                        schema.forEach(s => this.processSchema(s));
                    } else {
                        this.processSchema(schema);
                    }

                    // process each data table in the schema
                    Object.keys(this.data).forEach(t => {
                        if (Object.keys(dataset).includes(t.toUpperCase())) {
                            const table = dataset[t.toUpperCase()];
                            if (Array.isArray(table)) {
                                this.data[t].rows = table.length;
                                table.forEach(r => this.processRow(t, r));
                            } else {
                                this.data[t].rows = 1;
                                this.processRow(t, table);
                            }
                        }
                    });
                }
            }

            // look for a data file
            if (t.data.DataFile?.file) {
                const file = t.data.DataFile.file;

                // is this one file or an array of files?
                if (Array.isArray(file)) {
                    file.forEach(f => this.processFile(f));
                } else {
                    this.processFile(file);
                }
            }
        }
    }
}

//#endregion

//#region Utils

/**
 * Useful utility functions.
 */
namespace Utils {

    /**
     * Generates a key to be used for encrypting LIMSML request header information.
     * @param input string used to generate the key
     * @returns Buffer containing 128-bit encryption key
     */
    export function CreateKey(input: string): CryptoJS.lib.WordArray {
        const poly = 79764919; // nonstandard polynomial for CRC32
        const data = Buffer.from(input, "ascii");

        // generate CRC32 checksum from the input string
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

        // convert the checksum into a hyphen-delimited string of hex digits
        const crcText = [
            (crc >> 24 & 0xff),
            (crc >> 16 & 0xff),
            (crc >> 8 & 0xff),
            (crc & 0xff)
        ].map((n: number) => (n < 16 ? "0" : "") + n.toString(16)).join("-").toUpperCase();

        // get the MD5 hash of the hex digit string
        const key = CryptoJS.MD5(crcText);

        // set the last 11 bytes of the hash to 0
        key.words[1] = key.words[1] & 0xff000000;
        key.words[2] = key.words[3] = 0;
        
        // return the 40-bit key 0-padded to be 128 bits long)
        return key;
    }

    /**
     * Encrypts the given text using an RC4 cipher and the given key. Not exported.
     * @param key encryption key generated with CreateKey()
     * @param plaintext the text to be encrypted
     * @returns the encrypted text as a string of hex digits
     */
    export function EncryptString(key: CryptoJS.lib.WordArray, plaintext?: string): string {
        
        // initialize the ciphertext as an empty string
        let ciphertext = "";

        // did we get non-empty plaintext?
        if (plaintext && plaintext.length > 0) {

            // encrypt the plaintext
            const cipher = CryptoJS.RC4.encrypt(CryptoJS.enc.Utf16LE.parse(plaintext), key);

            // return the hex-encoded ciphertext
            return cipher.ciphertext.toString(CryptoJS.enc.Hex);
        }

        // return the ciphertext
        return ciphertext;
    }

    /**
     * Converts an Action to an XML object
     * @param action Action
     * @param options conversion options
     * @returns object suitable for conversion to XML
     */
    export function NodeToObject(action: Action, root?: boolean): any;

    /**
     * Converts an Entity to an XML object
     * @param action Entity
     * @param options conversion options
     * @returns object suitable for conversion to XML
     */
    export function NodeToObject(entity: Entity, root?: boolean): any;

    /**
     * Converts a System to an XML object
     * @param action System
     * @param options conversion options
     * @returns object suitable for conversion to XML
     */
    export function NodeToObject(system: System, root?: boolean): any;

    /**
     * Converts a Transaction to an XML object
     * @param action Transaction
     * @param options conversion options
     * @returns object suitable for conversion to XML
     */
    export function NodeToObject(transaction: Transaction, root?: boolean): any;

    /**
     * Converts a Request to an XML object
     * @param action Request
     * @param options conversion options
     * @returns object suitable for conversion to XML
     */
    export function NodeToObject(request: Request, root?: boolean): any;

    export function NodeToObject(node: any, root?: boolean): any {
        
        // default is root
        root ??= true;

        // xml declaration
        const declaration = { _attributes: { version: "1.0", encoding: "utf-8" } };

        // namespaces
        const xmlnsXsd = "http://www.w3.org/2001/XMLSchema";
        const xmlnsXsi = "http://www.w3.org/2001/XMLSchema-instance";
        const xmlns = "http://www.thermo.com/informatics/xmlns/limsml/1.0";

        // initialize our object
        let obj: any = { };

        // is this an Action?
        if (node.command) {
            const action = node as Action;

            // create basic structure
            obj = {
                action: {
                    command: { _text: action.command.toUpperCase() }
                }
            };

            // add parameters
            if (action.parameters) {
                obj.action.parameter = [ ];
                Object.keys(action.parameters).forEach(p => {
                    obj.action.parameter.push({
                        _attributes: { name: p.toUpperCase() },
                        _text: ValueToString((<Parameters>action.parameters)[p])
                    });
                });
            }
        }

        // is this an entity node?
        else if (node.type) {
            const entity = node as Entity;

            // create basic object structure
            obj = {
                entity: {
                    _attributes: { type: entity.type.toUpperCase() },
                    actions: { },
                    fields: { },
                    children: { }
                }
            }

            // add action
            if (entity.action) {
                obj.entity.actions.action = NodeToObject(entity.action, false).action;
            }

            // add fields
            if (entity.fields) {
                obj.entity.fields.field = [ ];
                Object.keys(entity.fields).forEach(id => {
                    const field = (<Fields>entity.fields)[id]

                    // add basic field structure
                    const fieldObj = {
                        _attributes: { id } as any,
                        _text: ValueToString(field.value ? field.value : field)
                    };

                    // add specified attributes
                    if (field.value) {
                        Object.keys(field).filter(f => f !== "value").forEach(a => {
                            fieldObj._attributes[a] = field[a];
                        });
                    }

                    // add additional attributes
                    if (!fieldObj._attributes.direction) fieldObj._attributes.direction = FieldDirections.In;
                    if (!fieldObj._attributes.datatype) fieldObj._attributes.datatype = FieldDataTypes.Text;

                    // add the field to the entity
                    obj.entity.fields.field.push(fieldObj);
                });
            }

            // add children
            if (entity.children) {
                obj.entity.children = { entity: entity.children.map(e => NodeToObject(e, false).entity) };
            }
        }

        // is this a system node?
        else if (node.responseType) {
            const system = node as System;

            // create basic object structure
            obj = {
                system: {
                    _attributes: { response_type: system.responseType.toLowerCase() },
                    entity: NodeToObject(system.entity, true).entity
                }
            };

            // add XML namespace if this is the top level
            if (root) {
                obj.system._attributes.xmlns = xmlns;
            }
        }

        // is this a transaction node?
        else if (node.system) {
            const transaction = node as Transaction;

            // add XML declaration if this is the top level
            obj = root ? { _declaration: declaration } : { } as any;

            // create basic object structure
            obj.transaction = {
                system: NodeToObject(transaction.system, root).system
            };

            // is this the top level?
            if (root) {

                // add XML namespaces
                obj.transaction._attributes = {
                    "xmlns:xsd": xmlnsXsd,
                    "xmlns:xsi": xmlnsXsi
                };
            }
        }

        // is this a request object?
        else if (node instanceof Request) {
            const request = node as Request;
            const header = request.header as any;

            // add XML declaration if this is the top level
            obj = root ? { _declaration: declaration } : { } as any;

            // create basic object structure
            obj.limsml = { // this is a little different than the others
                header: {
                    parameter: Object.keys(header).map(p => <any>{
                        _attributes: { name: p.toUpperCase() },
                        _text: header[p]
                    })
                },
                body: {
                    transaction: request.transactions.map(t => NodeToObject(t, false).transaction)
                }
            };

            // is this the top level?
            if (root) {

                // add XML namespaces
                obj.limsml._attributes = {
                    "xmlns:xsd": xmlnsXsd,
                    "xmlns:xsi": xmlnsXsi,
                    xmlns: xmlns
                };
            }
        }

        return obj;
    }

    /**
     * Converts an XML object to an XML string.
     * @param obj XML object
     * @param pretty pretty-print the XML string?
     * @returns XML string
     */
    export function ObjectToXml(obj: any, pretty?: boolean): string {
        
        // default is don't pretty-print
        pretty ??= false;

        // convert the object to an XML string
        let xml = convert.js2xml(obj, { compact: true, spaces: pretty ? 2 : 0 });

        // add a space into the self-closing tags
        xml = xml.replace(/<(\w+)\/>/g, (_, tag) => `<${tag} />`);

        // return the xml
        return xml;
    }

    /**
     * Converts a given value to its string representation.
     * @param value value to convert
     * @returns string representation of value
     */
    export function ValueToString(value: any): string {

        // TODO: handle dates correctly
        switch (typeof value) {

            // undefined just goes to blank
            case "undefined":
                value = "";
                break;

            // True or False
            case "boolean":
                value = value ? "True" : "False";
                break;

            // nothing special needs to be done for strings
            case "string":
                break;

            // number-like things just use the built-in toString()
            case "number":
            case "bigint":
                value = value.toString();
                break;

            // just use the built-in toString() for everything else
            default:
                value = value.toString();
                break;
        }
        return value;
    }

    /**
     * Converts a string to a value given a data type.
     * @param str string to convert
     * @param type datatype of string
     * @returns value of string
     */
    export function StringToValue(str: string, type: string): any {
        let value: any = str;

        // TODO: handle more than just booleans
        switch(type) {
            case "boolean":
                value = str.toLowerCase() === "true";
                break;
        }

        return value;
    }

    /**
     * Converts an identity in underscore_case to CamelCase. This is *not*
     * guaranteed to be the inverse of `CamelCaseToUnderscore()`.
     * @param underscore identity in underscore_case
     * @returns identity in CamelCase
     */
    export function UnderscoreToCamelCase(underscore: string): string {
        return underscore.length > 1
            ? ((s: string) => s.substr(0, 1).toLowerCase() + s.substr(1))(
                underscore
                    .split('_')
                    .map(s => s.substr(0, 1).toUpperCase() + s.substr(1).toLowerCase())
                    .join('')
            )
            : underscore.toUpperCase();
    }

    /**
     * Converts an identity in CamelCase to underscore_case. This is *not*
     * guaranteed to be the inverse of `UnderscoreToCamelCase()`.
     * @param camelCase identity in CamelCase
     * @returns identity in underscore_case
     */
    export function CamelCaseToUnderscore(camelCase: string): string {
        return camelCase
            .replace(/(.)([A-Z])/g, ((_, a, b) => `${a}_${b}`))
            .replace(/([^0-9])([0-9])/g, ((_, a, b) => `${a}_${b}`))
            .toLowerCase();
    }
}

//#endregion

//#region Functions

/**
 * Creates a new client connection via LIMSML web service.
 * @param username SampleManager username (default = `"SYSTEM"`)
 * @param password SampleManager password (default = `""`)
 * @param url location to access LIMSML web service (default = `"http://localhost:56104/wsdl?wsdl"`)
 * @param debug debug flag (default = `false`)
 * @returns `Client` instance
 * @deprecated Please use `Client.login()` instead.
 */
export async function Connect(
    username: string = "SYSTEM",
    password: string = "",
    url: string = "http://localhost:56104/wsdl?wsdl",
    debug: boolean = false
): Promise<Client> {
    return Client.login(username, password, url, debug);
}

//#endregion

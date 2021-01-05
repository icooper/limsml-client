/**
 * A JavaScript client for the LIMSML web service used by the Thermo Fisher SampleManager LIMS application.
 * @author Ian Cooper
 * @module limsml-client
 */
/** Limsml connection types */
declare enum ConnectionType {
    StartSession = "StartSession",
    ContinueSession = "ContinueSession",
    EndSession = "EndSession",
    Proxy = "Proxy"
}
/** Limsml return types */
declare enum ResponseType {
    System = "system",
    Data = "data"
}
/** Options for the Action constructor */
declare type ActionOptions = {
    allParameters?: string[];
    requiredParameters?: string[];
    validEntities?: string[];
};
/** Contains information about a column of a data table */
declare type DataColumns = {
    [name: string]: {
        caption: string;
        type: string;
    };
};
/** Contains tabular data with column information */
declare type DataTable = {
    columns: DataColumns;
    rows: number;
    table: any[];
};
/** Fields for an entity */
declare type Fields = {
    [id: string]: {
        value: any;
        [attribute: string]: any;
    } | any;
};
/** Parameters for an action */
declare type Parameters = {
    [name: string]: any;
};
/** LIMSML response data */
declare type ResponseData<T> = {
    [name: string]: T;
};
/** Used to represent a LIMSML <action> node */
declare type Action = {
    command: string;
    parameters?: Parameters;
};
/** Used to represent a LIMSML <entity> node */
export declare type Entity = {
    type: string;
    action?: Action;
    fields?: Fields;
    children?: Entity[];
};
/** Used to represent a LIMSML <header> node */
declare type Header = {
    user: string;
    password?: string;
    session?: string;
    connect: ConnectionType;
};
/** Used to represent a LIMSML <system> node */
declare type System = {
    responseType: ResponseType;
    entity: Entity;
};
/** Used to represent a LIMSML <transaction> node */
declare type Transaction = {
    system: System;
};
/**
 * Represents a LIMSML action definition.
 */
declare class ActionDefinition {
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
    constructor(command: string, returnType?: ResponseType, options?: ActionOptions);
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
    /**
     * Validate the entity and parameters for this action.
     * @param parameters parameters to be validated
     * @param entity entity type or Entity to be validated
     * @returns true if the entity and parameters are valid for this action
     */
    validate(parameters: Parameters, entity: string | Entity): boolean;
    /**
     * Parses the optional arguments used by `Action.createTransaction()`.
     * @param arg1 Parameters or Entity
     * @param arg2 Entity
     * @returns object with keys: `parameters`, `entity`
     */
    static parseArgs(arg1?: any, arg2?: any): {
        parameters?: Parameters;
        entity: Entity;
    };
}
/**
 * Client for communicating with a SampleManager server via the LIMSML protocol.
 * This should be instantiated using `Client.login()`.
 */
export declare class Client {
    /** SampleManager username */
    readonly _username: string;
    /** SampleManager password */
    private readonly _password;
    /** LIMSML web service url (e.g. `http://localhost:56104/`) */
    readonly _url: string;
    /** LIMSML session number */
    _session?: string;
    /** debug mode flag */
    readonly _debug: boolean;
    /** list of valid actions */
    _actions?: {
        [id: string]: ActionDefinition;
    };
    /** dynamically-created Action methods */
    [method: string]: any;
    /**
     * Creates a new LIMSML client instance.
     * @param username SampleManager username
     * @param password SampleManager password
     * @param client SOAP client instance
     * @param debug debug flag
     */
    private constructor();
    /**
     * Executes a transaction created by an Action instance.
     * @param transaction Transaction to execute
     * @returns the response from the LIMSML server
     */
    protected _execute(transaction: Transaction): Promise<Response>;
    /**
     * Executes an array of transactions created by an Action instance.
     * @param transactions array of Transactions to execute
     * @returns the response from the LIMSML server
     */
    protected _execute(transactions: Transaction[]): Promise<Response>;
    /**
     * Constructs the appropriate Header for the inferred or specified connection type.
     * @param type optional connection type
     * @returns Header with connection details
     */
    protected _getHeader(type?: ConnectionType): Header;
    /**
     * Logs into the server. This is called by `Client.login()` and must be
     * completed before any other transactions can be executed.
     * @returns Promise of true if the login was successful
     */
    private _login;
    logout(): Promise<void>;
    /**
     * Sends a request to the LIMSML server and returns the response
     * @param request Request
     * @returns Response promise
     */
    protected _process(request: Request): Promise<Response>;
    /**
     * Registers a LIMSML action with the client
     * @param entity entity name
     * @param action Action instance
     */
    protected _registerAction(entity: string, action: ActionDefinition): void;
    /**
     * Creates a new client connection via LIMSML web service.
     * @param username SampleManager username (default = `"SYSTEM"`)
     * @param password SampleManager password (default = `""`)
     * @param url location to access LIMSML web service (default = `"http://localhost:56104/"`)
     * @param debug debug flag (default = `false`)
     */
    static login(username?: string, password?: string, url?: string, debug?: boolean): Promise<Client>;
}
/**
 * LIMSML request.
 */
declare class Request {
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
    /**
     * Encrypts the header information
     */
    private encryptHeader;
    /**
     * Returns the request as an XML object.
     * @returns object suitable for conversion to XML
     */
    toObject(): any;
    /**
     * Returns the request as an XML string.
     * @returns XML string
     */
    toXml(pretty?: boolean): string;
    /**
     * Returns the request as a SOAP XML request string.
     * @returns SOAP XML request string
     */
    toSoapXml(): string;
}
/**
 * LIMSML response from the server.
 */
declare class Response {
    /** Parameters returned in the LIMSML response */
    readonly parameters: Parameters;
    /** Data returned in the LIMSML response */
    readonly data: ResponseData<DataTable>;
    /** System messages returned in the LIMSML response */
    readonly system: ResponseData<string>;
    /** Error messages returned in the LIMSML response */
    readonly errors: string[];
    /** Create a new LIMSML response object.
     * @param response the LIMSML response XML object
     */
    constructor(response: any);
    /**
     * Processes an error message in the LIMSML response XML object.
     * @param e error node
     */
    protected processError(e: any): void;
    /**
     * Processes a parameter node from the LIMSML response XML object.
     * @param p parameter node
     */
    protected processParameter(p: any): void;
    /**
     * Processes a dataset row in the LIMSML response XML object.
     * @param table table name
     * @param row row node
     */
    protected processRow(table: string, row: any): void;
    /**
     * Processes a dataset schema in the LIMSML response XML object.
     * @param schema schema node
     */
    protected processSchema(schema: any): void;
    /**
     * Processes a transaction node from the LIMSML response XML object.
     * @param t transaction node
     */
    protected processTransaction(t: any): void;
}
/**
 * Creates a new client connection via LIMSML web service.
 * @param username SampleManager username (default = `"SYSTEM"`)
 * @param password SampleManager password (default = `""`)
 * @param url location to access LIMSML web service (default = `"http://localhost:56104/wsdl?wsdl"`)
 * @param debug debug flag (default = `false`)
 * @returns `Client` instance
 * @deprecated Please use `Client.login()` instead.
 */
export declare function Connect(username?: string, password?: string, url?: string, debug?: boolean): Promise<Client>;
export {};

"use strict";
/**
 * A JavaScript client for the LIMSML web service used by the Thermo Fisher SampleManager LIMS application.
 * @author Ian Cooper
 * @module limsml-client
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connect = void 0;
//#region Imports
var crypto_1 = __importDefault(require("crypto"));
var soap = __importStar(require("soap"));
var xml_js_1 = __importDefault(require("xml-js"));
var util_1 = __importDefault(require("util"));
//#endregion
//#region Constants
/**
 * The name of the generic entity
 */
var GenericEntity = "generic";
//#endregion
//#region Enums
/** Limsml connection types */
var ConnectionType;
(function (ConnectionType) {
    ConnectionType["StartSession"] = "StartSession";
    ConnectionType["ContinueSession"] = "ContinueSession";
    ConnectionType["EndSession"] = "EndSession";
    ConnectionType["Proxy"] = "Proxy";
})(ConnectionType || (ConnectionType = {}));
/** Entity field data types */
var FieldDataTypes;
(function (FieldDataTypes) {
    FieldDataTypes["Text"] = "Text";
})(FieldDataTypes || (FieldDataTypes = {}));
/** Entity field directions */
var FieldDirections;
(function (FieldDirections) {
    FieldDirections["In"] = "in";
    FieldDirections["Out"] = "out";
})(FieldDirections || (FieldDirections = {}));
/** Limsml return types */
var ResponseType;
(function (ResponseType) {
    ResponseType["System"] = "system";
    ResponseType["Data"] = "data";
})(ResponseType || (ResponseType = {}));
//#endregion
//#region Classes
/**
 * Represents a LIMSML action definition.
 */
var ActionDefinition = /** @class */ (function () {
    /**
     * Creates a new Action
     * @param command action command
     * @param returnType action response type (default = `"system"`)
     * @param options parameter list, required parameter list, valid entity type list
     */
    function ActionDefinition(command, returnType, options) {
        if (returnType === void 0) { returnType = ResponseType.System; }
        var _a, _b, _c;
        this.command = command.toLowerCase();
        this.returnType = returnType;
        this.allParameters = ((_a = options === null || options === void 0 ? void 0 : options.allParameters) !== null && _a !== void 0 ? _a : []).map(function (p) { return p.toLowerCase(); });
        this.requiredParameters = ((_b = options === null || options === void 0 ? void 0 : options.requiredParameters) !== null && _b !== void 0 ? _b : []).map(function (r) { return r.toLowerCase(); });
        this.validEntities = ((_c = options === null || options === void 0 ? void 0 : options.validEntities) !== null && _c !== void 0 ? _c : []).map(function (e) { return e.toLowerCase(); });
    }
    ActionDefinition.prototype.createTransaction = function (arg1, arg2) {
        // parse args
        var parsedArgs = ActionDefinition.parseArgs(arg1, arg2);
        var parameters = parsedArgs.parameters;
        var entity = parsedArgs.entity;
        // check that the entity and parameters are valid for this action
        if (this.validate(parameters !== null && parameters !== void 0 ? parameters : {}, entity)) {
            // create the Action
            var action = {
                command: this.command
            };
            // add the parameters to the Action
            if (parameters) {
                var inputParams_1 = parameters;
                var actionParams_1 = {};
                // if this Action has defined parameters, then only add the defined parameters
                if (this.allParameters.length > 0) {
                    this.allParameters.forEach(function (p) {
                        if (Object.keys(inputParams_1).includes(p)) {
                            actionParams_1[p] = inputParams_1[p];
                        }
                    });
                }
                // otherwise just add them all
                else {
                    Object.keys(parameters).forEach(function (p) {
                        actionParams_1[p] = inputParams_1[p];
                    });
                }
                action.parameters = actionParams_1;
            }
            // assign the Action to the Entity
            entity.action = action;
            // return the Transaction (with inline System)
            return {
                system: {
                    responseType: this.returnType,
                    entity: entity
                }
            };
        }
        else {
            throw new Error("Invalid parameters or entity specified for action " + this.command + ".");
        }
    };
    /**
     * Validate the entity and parameters for this action.
     * @param parameters parameters to be validated
     * @param entity entity type or Entity to be validated
     * @returns true if the entity and parameters are valid for this action
     */
    ActionDefinition.prototype.validate = function (parameters, entity) {
        // make sure that entity is just a string
        if (typeof entity !== "string") {
            entity = entity.type;
        }
        // check entity types
        var valid = this.validEntities.length === 0 || this.validEntities.includes(entity) || this.validEntities.includes(GenericEntity);
        // check required parameters
        this.requiredParameters.forEach(function (p) { return valid && (valid = Object.keys(parameters).includes(p)); });
        return valid;
    };
    /**
     * Parses the optional arguments used by `Action.createTransaction()`.
     * @param arg1 Parameters or Entity
     * @param arg2 Entity
     * @returns object with keys: `parameters`, `entity`
     */
    ActionDefinition.parseArgs = function (arg1, arg2) {
        var parameters, entity;
        if (arg2) {
            parameters = arg1;
            entity = typeof arg2 === "string" ? { type: arg2 } : arg2;
        }
        else if (typeof arg1 === "string") {
            entity = { type: arg1 };
        }
        else if (arg1.type) {
            entity = arg1;
        }
        else {
            parameters = arg1;
            entity = { type: "system" };
        }
        return { parameters: parameters, entity: entity };
    };
    return ActionDefinition;
}());
/**
 * Client for communicating with a SampleManager server via the LIMSML protocol.
 * This should generally be instantiated using the top-level `Connect()` function.
 */
var Client = /** @class */ (function () {
    /**
     * Creates a new LIMSML client instance.
     * @param username SampleManager username
     * @param password SampleManager password
     * @param client SOAP client instance
     * @param debug debug flag
     */
    function Client(username, password, client, debug) {
        this._username = username;
        this._password = password;
        this._client = client;
        this._debug = debug !== null && debug !== void 0 ? debug : false;
    }
    Client.prototype._execute = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var transactions, request, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._session) return [3 /*break*/, 2];
                        transactions = void 0;
                        // is the input already an array?
                        if (Array.isArray(input)) {
                            transactions = input;
                        }
                        // input must be a single transaction
                        else {
                            transactions = [input];
                        }
                        request = new Request(this._getHeader(), transactions);
                        return [4 /*yield*/, this._process(request)];
                    case 1:
                        response = _a.sent();
                        // return the response
                        return [2 /*return*/, response];
                    case 2: throw new Error("Not logged in.");
                }
            });
        });
    };
    /**
     * Constructs the appropriate Header for the inferred or specified connection type.
     * @param type optional connection type
     * @returns Header with connection details
     */
    Client.prototype._getHeader = function (type) {
        // header should default to ContinueSession if we're logged in
        type !== null && type !== void 0 ? type : (type = this._session ? ConnectionType.ContinueSession : ConnectionType.StartSession);
        // create the header with the username
        var header = {
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
    };
    /**
     * Logs into the server. This must be called before any other transactions are executed.
     * @returns Promise of true if the login was successful
     */
    Client.prototype.login = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var actionsTable, paramsTable, transactions, request, response, actionsData, paramsData_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        actionsTable = "limsml_entity_action";
                        paramsTable = "limsml_entity_param";
                        transactions = [actionsTable, paramsTable]
                            .map(function (t) { return new ActionDefinition("find", ResponseType.Data).createTransaction({ pagesize: 1000 }, t); });
                        request = new Request(this._getHeader(ConnectionType.StartSession), transactions);
                        // send the login request
                        if (this._debug)
                            console.error("login(): logging in as user " + this._username);
                        return [4 /*yield*/, this._process(request)];
                    case 1:
                        response = _b.sent();
                        // look for the session in the login response
                        if (response.parameters.session) {
                            // save the session
                            this._session = response.parameters.session;
                            if (this._debug)
                                console.error("login(): logged in with session " + ((_a = this._session) === null || _a === void 0 ? void 0 : _a.trim()));
                            // get the LIMSML actions available if we don't already have a list
                            if (!this._actions && response.data[actionsTable] && response.data[paramsTable]) {
                                actionsData = response.data[actionsTable];
                                paramsData_1 = response.data[paramsTable];
                                if (this._debug)
                                    console.error("login(): reading available LIMSML actions");
                                // create an action for each of the actions except login and logout
                                actionsData.table.filter(function (a) { return !["login", "logout"].includes(a.action.toLowerCase()); }).forEach(function (a) {
                                    var allParameters = [];
                                    var requiredParameters = [];
                                    // iterate through each parameter relevant to that action
                                    paramsData_1.table.filter(function (p) { return p.entity === a.entity && p.action === a.action; }).forEach(function (p) {
                                        // add the parameter to the parameter list
                                        allParameters.push(p.parameter);
                                        // is this parameter mandatory?
                                        if (p.is_mandatory) {
                                            // add the parameter to the mandatory parameter list
                                            requiredParameters.push(p.parameter);
                                        }
                                    });
                                    // create the action and register it with the client
                                    var action = new ActionDefinition(a.action, a.return_type, { allParameters: allParameters, requiredParameters: requiredParameters, validEntities: [a.entity] });
                                    _this._registerAction(a.entity.toLowerCase(), action);
                                });
                            }
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    Client.prototype.logout = function () {
        return __awaiter(this, void 0, void 0, function () {
            var transaction, request, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._session) return [3 /*break*/, 2];
                        transaction = new ActionDefinition("logout", ResponseType.Data).createTransaction("user");
                        request = new Request(this._getHeader(ConnectionType.EndSession), transaction);
                        return [4 /*yield*/, this._process(request)];
                    case 1:
                        response = _a.sent();
                        // process the logout response
                        if (response.errors.length === 0) {
                            this._session = undefined;
                        }
                        if (this._debug)
                            console.error("logout(): " + (response.errors.length === 0 ? "succeeded" : "failed"));
                        return [3 /*break*/, 3];
                    case 2:
                        if (this._debug)
                            console.error("logout(): not logged in to begin with");
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sends a request to the LIMSML server and returns the response
     * @param request Request
     * @returns Response promise
     */
    Client.prototype._process = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var rawResponse, responseObj, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // log the request XML
                        if (this._debug) {
                            console.error("process(): sent XML =");
                            console.error(request.toXml(true).replace(/^/gm, "     "));
                        }
                        return [4 /*yield*/, this._client.ProcessAsync({ request: request.toXml() })];
                    case 1:
                        rawResponse = _a.sent();
                        responseObj = xml_js_1.default.xml2js(rawResponse[0].ProcessResult, { compact: true });
                        response = new Response(responseObj);
                        // log the response information
                        if (this._debug) {
                            // console.error("process(): received XML =");
                            // console.error(Utils.ObjectToXml(responseObj, true).replace(/^/gm, "     "));
                            console.error("process(): received object =");
                            console.error(util_1.default.inspect(response, false, 3, true).replace(/^/gm, "     "));
                        }
                        // return the Response instance
                        return [2 /*return*/, response];
                }
            });
        });
    };
    /**
     * Registers a LIMSML action with the client
     * @param entity entity name
     * @param action Action instance
     */
    Client.prototype._registerAction = function (entity, action) {
        var _a;
        // create the actions list if it's undefined
        (_a = this._actions) !== null && _a !== void 0 ? _a : (this._actions = {});
        // put together an action ID and function name
        var command = action.command;
        var actionId = [entity, command].join('.');
        var actionFunc = Utils.UnderscoreToCamelCase(command);
        // add the action to the actions list
        this._actions[actionId] = action;
        // create an action handler
        if (!this[actionFunc]) {
            if (this._debug)
                console.error("registerAction(): registering " + actionId + " to new function " + actionFunc + "()");
            this[actionFunc] = function doAction(arg1, arg2) {
                return __awaiter(this, void 0, void 0, function () {
                    var parsedArgs, parameters, entity_1, actionId_1, transaction, response;
                    return __generator(this, function (_a) {
                        // make sure we have some actions defined
                        if (this._actions) {
                            parsedArgs = ActionDefinition.parseArgs(arg1, arg2);
                            parameters = parsedArgs.parameters;
                            entity_1 = parsedArgs.entity;
                            actionId_1 = undefined;
                            Object.keys(this._actions)
                                .filter(function (id) { return id === entity_1.type + "." + command; })
                                .forEach(function (id) { return actionId_1 = id; });
                            if (!actionId_1) {
                                Object.keys(this._actions)
                                    .filter(function (id) { return id === GenericEntity + "." + command; })
                                    .forEach(function (id) { return actionId_1 = id; });
                            }
                            // did we find an action?
                            if (actionId_1 && this._actions[actionId_1]) {
                                transaction = this._actions[actionId_1].createTransaction(parameters, entity_1);
                                response = this._execute(transaction);
                                // return the response
                                return [2 /*return*/, response];
                            }
                            // return an error since we couldn't match an action
                            else {
                                throw new Error("Could not find a registered action for " + entity_1.type + "." + command + ".");
                            }
                        }
                        // return an error since the action list is empty
                        else {
                            throw new Error("No actions registered.");
                        }
                        return [2 /*return*/];
                    });
                });
            };
        }
        else {
            if (this._debug)
                console.error("registerAction(): registering " + actionId + " to existing " + actionFunc + "() function");
        }
    };
    return Client;
}());
/**
 * LIMSML request.
 */
var Request = /** @class */ (function () {
    function Request(header, transactions) {
        this.header = header;
        this.transactions = Array.isArray(transactions) ? transactions : [transactions];
        // encrypt the header information
        this.encryptHeader();
    }
    /**
     * Encrypts the header information
     */
    Request.prototype.encryptHeader = function () {
        var _a;
        var _b;
        var key = Utils.CreateKey(this.transactions.map(function (t) { return Utils.ObjectToXml(Utils.NodeToObject(t)); }).join(''));
        this.header.user = Utils.EncryptString(key, this.header.user);
        switch (this.header.connect) {
            case ConnectionType.StartSession:
                (_a = (_b = this.header).password) !== null && _a !== void 0 ? _a : (_b.password = "");
                if (this.header.password.length < 10) {
                    this.header.password = (this.header.password + "          ").substr(0, 10);
                }
                this.header.password = Utils.EncryptString(key, this.header.password);
                break;
            case ConnectionType.ContinueSession:
            case ConnectionType.EndSession:
                this.header.session = Utils.EncryptString(key, this.header.session);
                break;
        }
    };
    /**
     * Returns the request as an XML object.
     * @returns object suitable for conversion to XML
     */
    Request.prototype.toObject = function () {
        return Utils.NodeToObject(this);
    };
    /**
     * Returns the request as an XML string.
     * @returns XML string
     */
    Request.prototype.toXml = function (pretty) {
        return Utils.ObjectToXml(this.toObject(), pretty);
    };
    return Request;
}());
/**
 * LIMSML response from the server.
 */
var Response = /** @class */ (function () {
    /** Create a new LIMSML response object.
     * @param response the LIMSML response XML object
     */
    function Response(response) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        this.parameters = {};
        this.data = {};
        this.system = {};
        this.errors = [];
        // get the parameters
        if ((_b = (_a = response.limsml) === null || _a === void 0 ? void 0 : _a.header) === null || _b === void 0 ? void 0 : _b.parameter) {
            var params = response.limsml.header.parameter;
            // just one parameter or an array of parameters?
            if (Array.isArray(params)) {
                params.forEach(function (p) { return _this.processParameter(p); });
            }
            else {
                this.processParameter(params);
            }
        }
        // go through the transactions
        if ((_d = (_c = response.limsml) === null || _c === void 0 ? void 0 : _c.body) === null || _d === void 0 ? void 0 : _d.transaction) {
            var transaction = response.limsml.body.transaction;
            // just one transaction or an array of transactions?
            if (Array.isArray(transaction)) {
                transaction.forEach(function (t) { return _this.processTransaction(t); });
            }
            else {
                this.processTransaction(transaction);
            }
        }
        // go through the errors
        if ((_f = (_e = response.limsml) === null || _e === void 0 ? void 0 : _e.errors) === null || _f === void 0 ? void 0 : _f.error) {
            var error = response.limsml.errors.error;
            // just one error or an array of errors?
            if (Array.isArray(error)) {
                error.forEach(function (e) { return _this.processError(e); });
            }
            else {
                this.processError(error);
            }
        }
    }
    /**
     * Processes an error message in the LIMSML response XML object.
     * @param e error node
     */
    Response.prototype.processError = function (e) {
        var _a, _b, _c, _d;
        // get the top-level error
        if (((_a = e.description) === null || _a === void 0 ? void 0 : _a._text) && ((_b = e.code) === null || _b === void 0 ? void 0 : _b._text)) {
            this.errors.push(e.description._text + " (" + e.code._text + ")");
        }
        // get any child errors
        if ((_c = e.errors) === null || _c === void 0 ? void 0 : _c.error) {
            if (Array.isArray((_d = e.errors) === null || _d === void 0 ? void 0 : _d.error)) {
                e.errors.error.forEach(this.processError);
            }
            else {
                this.processError(e.errors.error);
            }
        }
    };
    /**
     * Processes a parameter node from the LIMSML response XML object.
     * @param p parameter node
     */
    Response.prototype.processParameter = function (p) {
        this.parameters[p._attributes.name.toLowerCase()] = p._text;
    };
    /**
     * Processes a dataset row in the LIMSML response XML object.
     * @param table table name
     * @param row row node
     */
    Response.prototype.processRow = function (table, row) {
        var _this = this;
        // create an object to hold the data for this row
        var rowData = {};
        // iterate through the columns
        Object.keys(row).forEach(function (c) {
            // normalize the column name
            var column = c.toLowerCase();
            // add the data to the row object
            rowData[column] = Utils.StringToValue(row[c]._text, _this.data[table].columns[column].type);
        });
        // add the row to the datatable
        this.data[table].table.push(rowData);
    };
    /**
     * Processes a dataset schema in the LIMSML response XML object.
     * @param schema schema node
     */
    Response.prototype.processSchema = function (schema) {
        var _this = this;
        var _a;
        // create the entry in the data field
        if (((_a = schema._attributes) === null || _a === void 0 ? void 0 : _a.name) &&
            schema["xs:complexType"] &&
            schema["xs:complexType"]["xs:sequence"] &&
            schema["xs:complexType"]["xs:sequence"]["xs:element"]) {
            var table_1 = schema._attributes.name.toLowerCase();
            var columns = schema["xs:complexType"]["xs:sequence"]["xs:element"];
            // create the datatable object
            this.data[table_1] = {
                columns: {},
                rows: 0,
                table: []
            };
            // add the column definitions
            columns.forEach(function (c) {
                _this.data[table_1].columns[c._attributes.name.toLowerCase()] = {
                    caption: c._attributes["msdata:Caption"],
                    type: c._attributes.type.substr(3)
                };
            });
        }
    };
    /**
     * Processes a transaction node from the LIMSML response XML object.
     * @param t transaction node
     */
    Response.prototype.processTransaction = function (t) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // is it a system transaction?
        if (t.system) {
            // look for a simple single returned value
            if (((_d = (_c = (_b = (_a = t.system.entity) === null || _a === void 0 ? void 0 : _a.actions) === null || _b === void 0 ? void 0 : _b.action) === null || _c === void 0 ? void 0 : _c.command) === null || _d === void 0 ? void 0 : _d._text) && ((_g = (_f = (_e = t.system.entity) === null || _e === void 0 ? void 0 : _e.fields) === null || _f === void 0 ? void 0 : _f.field) === null || _g === void 0 ? void 0 : _g._text)) {
                this.system[t.system.entity.actions.action.command._text.toLowerCase()] = t.system.entity.fields.field._text;
            }
        }
        // is it a data transaction?
        else if (t.data) {
            // look for a dataset
            if ((_h = t.data.ADODataSet) === null || _h === void 0 ? void 0 : _h.NewDataSet) {
                var dataset_1 = t.data.ADODataSet.NewDataSet;
                // schema?
                if (dataset_1["xs:schema"] &&
                    dataset_1["xs:schema"]["xs:element"] &&
                    dataset_1["xs:schema"]["xs:element"]["xs:complexType"] &&
                    dataset_1["xs:schema"]["xs:element"]["xs:complexType"]["xs:choice"] &&
                    dataset_1["xs:schema"]["xs:element"]["xs:complexType"]["xs:choice"]["xs:element"]) {
                    var schema = dataset_1["xs:schema"]["xs:element"]["xs:complexType"]["xs:choice"]["xs:element"];
                    // does the schema contain just one or more than one table?
                    if (Array.isArray(schema)) {
                        schema.forEach(function (s) { return _this.processSchema(s); });
                    }
                    else {
                        this.processSchema(schema);
                    }
                    // process each data table in the schema
                    Object.keys(this.data).forEach(function (t) {
                        if (Object.keys(dataset_1).includes(t.toUpperCase())) {
                            var table = dataset_1[t.toUpperCase()];
                            if (Array.isArray(table)) {
                                _this.data[t].rows = table.length;
                                table.forEach(function (r) { return _this.processRow(t, r); });
                            }
                            else {
                                _this.data[t].rows = 1;
                                _this.processRow(t, table);
                            }
                        }
                    });
                }
            }
        }
    };
    return Response;
}());
//#endregion
//#region Utils
/**
 * Useful utility functions.
 */
var Utils;
(function (Utils) {
    /**
     * Generates a key to be used for encrypting LIMSML request header information.
     * @param input string used to generate the key
     * @returns Buffer containing 128-bit encryption key
     */
    function CreateKey(input) {
        var poly = 79764919; // nonstandard polynomial for CRC32
        var data = Buffer.from(input, "ascii");
        // generate CRC32 checksum from the input string
        var crc = -1;
        for (var i = 0, l = data.length; i < l; i += 1) {
            var temp = (crc ^ data[i]) & 0xff;
            for (var j = 0; j < 8; j += 1) {
                if ((temp & 1) === 1) {
                    temp = (temp >>> 1) ^ poly;
                }
                else {
                    temp = (temp >>> 1);
                }
            }
            crc = (crc >>> 8) ^ temp;
        }
        crc ^= -1;
        // convert the checksum into a hyphen-delimited string of hex digits
        var crcText = [
            (crc >> 24 & 0xff),
            (crc >> 16 & 0xff),
            (crc >> 8 & 0xff),
            (crc & 0xff)
        ].map(function (n) { return (n < 16 ? "0" : "") + n.toString(16); }).join("-").toUpperCase();
        // get the MD5 hash of the hex digit string
        var key = crypto_1.default.createHash("md5").update(crcText).digest();
        // set the last 11 bytes of the hash to 0
        for (var i = 5; i < 16; i++)
            key[i] = 0;
        // return the 40-bit key 0-padded to be 128 bits long)
        return key;
    }
    Utils.CreateKey = CreateKey;
    /**
     * Encrypts the given text using an RC4 cipher and the given key. Not exported.
     * @param key encryption key generated with CreateKey()
     * @param plaintext the text to be encrypted
     * @returns the encrypted text as a string of hex digits
     */
    function EncryptString(key, plaintext) {
        // initialize the ciphertext as an empty string
        var ciphertext = "";
        // did we get non-empty plaintext?
        if (plaintext && plaintext.length > 0) {
            // create an RC4 cipher with no initialization vector
            var cipher = crypto_1.default.createCipheriv("rc4", key, null);
            // encrypt the plaintext
            ciphertext = cipher.update(plaintext, "utf16le", "hex");
            ciphertext += cipher.final("hex");
        }
        // return the ciphertext
        return ciphertext;
    }
    Utils.EncryptString = EncryptString;
    function NodeToObject(node, root) {
        // default is root
        root !== null && root !== void 0 ? root : (root = true);
        // xml declaration
        var declaration = { _attributes: { version: "1.0", encoding: "utf-8" } };
        // namespaces
        var xmlnsXsd = "http://www.w3.org/2001/XMLSchema";
        var xmlnsXsi = "http://www.w3.org/2001/XMLSchema-instance";
        var xmlns = "http://www.thermo.com/informatics/xmlns/limsml/1.0";
        // initialize our object
        var obj = {};
        // is this an Action?
        if (node.command) {
            var action_1 = node;
            // create basic structure
            obj = {
                action: {
                    command: { _text: action_1.command.toUpperCase() }
                }
            };
            // add parameters
            if (action_1.parameters) {
                obj.action.parameter = [];
                Object.keys(action_1.parameters).forEach(function (p) {
                    obj.action.parameter.push({
                        _attributes: { name: p.toUpperCase() },
                        _text: ValueToString(action_1.parameters[p])
                    });
                });
            }
        }
        // is this an entity node?
        else if (node.type) {
            var entity_2 = node;
            // create basic object structure
            obj = {
                entity: {
                    _attributes: { type: entity_2.type.toUpperCase() },
                    actions: {},
                    fields: {},
                    children: {}
                }
            };
            // add action
            if (entity_2.action) {
                obj.entity.actions.action = NodeToObject(entity_2.action, false).action;
            }
            // add fields
            if (entity_2.fields) {
                obj.entity.fields.field = [];
                Object.keys(entity_2.fields).forEach(function (id) {
                    var field = entity_2.fields[id];
                    // add basic field structure
                    var fieldObj = {
                        _attributes: { id: id },
                        _text: ValueToString(field.value ? field.value : field)
                    };
                    // add specified attributes
                    if (field.value) {
                        Object.keys(field).filter(function (f) { return f !== "value"; }).forEach(function (a) {
                            fieldObj._attributes[a] = field[a];
                        });
                    }
                    // add additional attributes
                    if (!fieldObj._attributes.direction)
                        fieldObj._attributes.direction = FieldDirections.In;
                    if (!fieldObj._attributes.datatype)
                        fieldObj._attributes.datatype = FieldDataTypes.Text;
                    // add the field to the entity
                    obj.entity.fields.field.push(fieldObj);
                });
            }
            // add children
            if (entity_2.children) {
                obj.entity.children = { entity: entity_2.children.map(function (e) { return NodeToObject(e, false).entity; }) };
            }
        }
        // is this a system node?
        else if (node.responseType) {
            var system = node;
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
            var transaction = node;
            // add XML declaration if this is the top level
            obj = root ? { _declaration: declaration } : {};
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
            var request = node;
            var header_1 = request.header;
            // add XML declaration if this is the top level
            obj = root ? { _declaration: declaration } : {};
            // create basic object structure
            obj.limsml = {
                header: {
                    parameter: Object.keys(header_1).map(function (p) { return ({
                        _attributes: { name: p.toUpperCase() },
                        _text: header_1[p]
                    }); })
                },
                body: {
                    transaction: request.transactions.map(function (t) { return NodeToObject(t, false).transaction; })
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
    Utils.NodeToObject = NodeToObject;
    /**
     * Converts an XML object to an XML string.
     * @param obj XML object
     * @param pretty pretty-print the XML string?
     * @returns XML string
     */
    function ObjectToXml(obj, pretty) {
        // default is don't pretty-print
        pretty !== null && pretty !== void 0 ? pretty : (pretty = false);
        // convert the object to an XML string
        var xml = xml_js_1.default.js2xml(obj, { compact: true, spaces: pretty ? 2 : 0 });
        // add a space into the self-closing tags
        xml = xml.replace(/<(\w+)\/>/g, function (_, tag) { return "<" + tag + " />"; });
        // return the xml
        return xml;
    }
    Utils.ObjectToXml = ObjectToXml;
    /**
     * Converts a given value to its string representation.
     * @param value value to convert
     * @returns string representation of value
     */
    function ValueToString(value) {
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
    Utils.ValueToString = ValueToString;
    /**
     * Converts a string to a value given a data type.
     * @param str string to convert
     * @param type datatype of string
     * @returns value of string
     */
    function StringToValue(str, type) {
        var value = str;
        // TODO: handle more than just booleans
        switch (type) {
            case "boolean":
                value = str.toLowerCase() === "true";
                break;
        }
        return value;
    }
    Utils.StringToValue = StringToValue;
    /**
     * Converts an identity in underscore_case to CamelCase. This is *not*
     * guaranteed to be the inverse of `CamelCaseToUnderscore()`.
     * @param underscore identity in underscore_case
     * @returns identity in CamelCase
     */
    function UnderscoreToCamelCase(underscore) {
        return underscore.length > 1
            ? (function (s) { return s.substr(0, 1).toLowerCase() + s.substr(1); })(underscore
                .split('_')
                .map(function (s) { return s.substr(0, 1).toUpperCase() + s.substr(1).toLowerCase(); })
                .join(''))
            : underscore.toUpperCase();
    }
    Utils.UnderscoreToCamelCase = UnderscoreToCamelCase;
    /**
     * Converts an identity in CamelCase to underscore_case. This is *not*
     * guaranteed to be the inverse of `UnderscoreToCamelCase()`.
     * @param camelCase identity in CamelCase
     * @returns identity in underscore_case
     */
    function CamelCaseToUnderscore(camelCase) {
        return camelCase
            .replace(/(.)([A-Z])/g, (function (_, a, b) { return a + "_" + b; }))
            .replace(/([^0-9])([0-9])/g, (function (_, a, b) { return a + "_" + b; }))
            .toLowerCase();
    }
    Utils.CamelCaseToUnderscore = CamelCaseToUnderscore;
})(Utils || (Utils = {}));
//#endregion
//#region Functions
/**
 * Creates a new client connection via LIMSML web service.
 * @param username SampleManager username (default = `"SYSTEM"`)
 * @param password SampleManager password (default = `""`)
 * @param url location to access LIMSML web service (default = `"http://localhost:56104/wsdl?wsdl"`)
 * @param debug debug flag (default = `false`)
 */
function Connect(username, password, url, debug) {
    if (username === void 0) { username = "SYSTEM"; }
    if (password === void 0) { password = ""; }
    if (url === void 0) { url = "http://localhost:56104/wsdl?wsdl"; }
    if (debug === void 0) { debug = false; }
    return __awaiter(this, void 0, void 0, function () {
        var client, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = Client.bind;
                    _b = [void 0, username, password];
                    return [4 /*yield*/, soap.createClientAsync(url)];
                case 1:
                    client = new (_a.apply(Client, _b.concat([_c.sent(), debug])))();
                    return [4 /*yield*/, client.login()];
                case 2:
                    _c.sent();
                    return [2 /*return*/, client];
            }
        });
    });
}
exports.Connect = Connect;
//#endregion

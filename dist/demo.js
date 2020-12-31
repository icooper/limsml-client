"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
// use the LIMSML client library
var LIMSML = __importStar(require("."));
// connect to the local LIMSML web service
LIMSML.Connect().then(function (client) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, _c, _d, _e, _f, sample, _g, _h, _j, reason_1;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                _k.trys.push([0, 5, , 6]);
                // run the simple ping action
                _b = (_a = console).log;
                _c = ["Ping:"];
                return [4 /*yield*/, client.ping({ message: "Howdy" })];
            case 1:
                // run the simple ping action
                _b.apply(_a, _c.concat([(_k.sent())
                        .system.ping]));
                // get the contents of the personnel table (up to 100 records)
                _e = (_d = console).log;
                _f = ["Personnel:"];
                return [4 /*yield*/, client.find({ pagesize: 100 }, "personnel")];
            case 2:
                // get the contents of the personnel table (up to 100 records)
                _e.apply(_d, _f.concat([(_k.sent())
                        .data.personnel.table
                        .map(function (r) { return ({ identity: r.identity, name: r.name }); })]));
                sample = {
                    type: "sample",
                    fields: { id_numeric: 2 },
                    children: [
                        {
                            type: "test",
                            fields: { analysis: "YELL_001" },
                            children: [
                                {
                                    type: "result",
                                    fields: {
                                        name: "Yellowness",
                                        text: "1234"
                                    }
                                }
                            ]
                        },
                        {
                            type: "test",
                            fields: { analysis: "WHITE_001" },
                            children: [
                                {
                                    type: "result",
                                    fields: {
                                        name: "Whiteness",
                                        text: "9876"
                                    }
                                }
                            ]
                        }
                    ]
                };
                _h = (_g = console).log;
                _j = ["Result Entry:"];
                return [4 /*yield*/, client.resultEntry(sample)];
            case 3:
                _h.apply(_g, _j.concat([(_k.sent())
                        .errors.length === 0
                        ? "success"
                        : "failure"]));
                // logout
                return [4 /*yield*/, client.logout()];
            case 4:
                // logout
                _k.sent();
                return [3 /*break*/, 6];
            case 5:
                reason_1 = _k.sent();
                console.log(reason_1);
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });

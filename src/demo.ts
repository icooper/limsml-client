import util from 'util';
import * as SampleManager from './SampleManager';

const url = 'http://localhost:56104/wsdl?wsdl';
const client = SampleManager.Client.create("SYSTEM", "", url, { debug: false, unsafe: true });

client.then(async (client: SampleManager.Client) => {
    try {
        const pingResult = await client.execute("system", {
            action: "ping",
            message: "Howdy"
        });
        console.log("Ping", pingResult["ping"]);

        const findResult = await client.execute("personnel", {
            action: "find",
            responseType: SampleManager.ResponseType.Data
        });
        console.log("Personnel", (<SampleManager.DataTable>findResult.personnel).table.map(a => `${a.name} (${a.identity})`));

        const resultEntry = new SampleManager.Transaction(new SampleManager.Entity("sample", {
            action: new SampleManager.Action("result_entry"),
            fields: [
                {
                    id: "id_numeric",
                    value: 2,
                    direction: "in"
                }
            ],
            children: [
                new SampleManager.Entity("test", {
                    fields: [
                        {
                            id: "analysis",
                            direction: "in",
                            value: "YELL_001"
                        }
                    ],
                    children: [
                        new SampleManager.Entity("result", {
                            fields: [
                                {
                                    id: "name",
                                    direction: "in",
                                    value: "Yellowness"
                                },
                                {
                                    id: "text",
                                    direction: "in",
                                    value: 987
                                }
                            ]
                        })
                    ]
                }),
                new SampleManager.Entity("test", {
                    fields: [
                        {
                            id: "analysis",
                            direction: "in",
                            value: "WHITE_001"
                        }
                    ],
                    children: [
                        new SampleManager.Entity("result", {
                            fields: [
                                {
                                    id: "name",
                                    direction: "in",
                                    value: "Whiteness"
                                },
                                {
                                    id: "text",
                                    direction: "in",
                                    value: 123
                                }
                            ]
                        })
                    ]
                })
            ]
        }));
        const resultEntryResult = await client.execute(resultEntry);
        console.log("Result entry", resultEntryResult._ ? "success" : "failure");

        await client.logout();
    } catch (reason) {
        console.log(reason);
    }
});

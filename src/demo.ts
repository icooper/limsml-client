import { Client, Action, Entity, ResponseType, DataTable } from './SampleManager';

const client = Client.create("SYSTEM", "", "http://localhost:56104/wsdl?wsdl", { debug: false, unsafe: true });

client.then(async (client: Client) => {
    try {

        // execute a ping action
        const pingResult = await client.execute("system", {
            action: "ping",
            message: "Howdy"
        });
        console.log("Ping", pingResult["ping"]);

        // get the first 100 records from the personnel table
        const findResult = await client.execute("personnel", {
            action: "find",
            responseType: ResponseType.Data
        });
        console.log("Personnel", (<DataTable>findResult.personnel).table.map(a => `${a.name} (${a.identity})`));

        // enter some results
        const resultEntry = await client.execute("sample", {
            action: new Action("result_entry"),
            fields: {
                "id_numeric": {
                    value: 2,
                    direction: "in"
                }
            },
            children: [
                new Entity("test", {
                    fields: {
                        analysis: {
                            direction: "in",
                            value: "YELL_001"
                        }
                    },
                    children: [
                        new Entity("result", {
                            fields: {
                                name: {
                                    direction: "in",
                                    value: "Yellowness"
                                },
                                text: {
                                    direction: "in",
                                    value: 444
                                }
                            }
                        })
                    ]
                }),
                new Entity("test", {
                    fields: {
                        analysis: {
                            direction: "in",
                            value: "WHITE_001"
                        }
                    },
                    children: [
                        new Entity("result", {
                            fields: {
                                name: {
                                    direction: "in",
                                    value: "Whiteness"
                                },
                                text: {
                                    direction: "in",
                                    value: 999
                                }
                            }
                        })
                    ]
                })
            ]
        });
        if (resultEntry._) {
            console.log("Result entry success");
        } else {
            console.log(`Result entry failure: ${resultEntry.error}`);
        }

        await client.logout();
    } catch (reason) {
        console.log(reason);
    }
});

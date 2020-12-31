// use the LIMSML client library
import * as LIMSML from '.';

// connect to the local LIMSML web service
LIMSML.Connect().then(async (client) => {
    try {

        // run the simple ping action
        console.log(
            "Ping:",
            (await client.ping({ message: "Howdy" }))
                .system.ping
        );

        // get the contents of the personnel table (up to 100 records)
        console.log(
            "Personnel:",
            (await client.find({ pagesize: 100 }, "personnel"))
                .data.personnel.table
                .map((r: any) => <any>{ identity: r.identity, name: r.name })
        );

        // enter some sample results
        const sample: LIMSML.Entity = {
            type: "sample",
            fields: { id_numeric: 2},
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
        console.log(
            "Result Entry:",
            (await client.resultEntry(sample))
                .errors.length === 0
                    ? "success"
                    : "failure"
        );

        // logout
        await client.logout();

    } catch (reason) {
        console.log(reason);
    }
});

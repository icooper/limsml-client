import path from 'path';

// use the LIMSML client library
import { Client, Entity } from '.';

// connect to the local LIMSML web service
Client.login().then(async (client) => {
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
                .map((r: any) => ({ [r.identity]: r.name }))
        );

        // enter some sample results
        const sample: Entity = {
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

        // get the results for sample 2
        console.log(
            "Get Results:",
            (await client.getResults({ sample_id: 2 }, "sample"))
                .data.result.table
                .map((r: any) => ({ [r.name]: r.result?.trim() }))
        );

        // get a logical (requires SYSTEM.LOGICAL action, see file ../vgl/limsml_utils.rpf)
        const logical = "smp$programs";
        const resolved = (await client.logical({ logical })).system.logical;
        console.log("Get Logical:", { [logical]: resolved });

        // get a file (requires SYSTEM.LOGICAL action)
        const filename = path.join(resolved, "LIMSML Examples", "Ping.xml");
        const pingxml = (await client.getFile({ filename })).files[0];
        console.log("Get File:", pingxml);

        // logout
        await client.logout();

    } catch (reason) {
        console.log(reason);
    }
});

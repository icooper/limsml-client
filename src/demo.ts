import * as soap from 'soap';
import xml2js from 'xml2js';
import util from 'util';
import * as Limsml from './Limsml';
import * as SampleManager from './SampleManager';

const url = 'http://localhost:56104/wsdl?wsdl';
const client = SampleManager.Client.create("SYSTEM", "", url);
const builder = new xml2js.Builder({ renderOpts: { pretty: true }});

client.then(async client => {
    try {
        const response = await client.ping("foo");
        const data = (<Limsml.DataResponse>response.body[0]).data;
        // console.log(builder.buildObject(data));
        // console.log(util.inspect(data, false, 3, true));
        await client.logout();
    } catch (reason) {
        console.log(reason);
    }
});


/*
const result = new Limsml.Entity("sample",
{
    fields: [
        { id: "name", value: "CONC", attributes: { direction: "in" } },
        { id: "text", value: "333.333", attributes: { direction: "in" } }
    ]
});
const test = new Limsml.Entity("sample",
{
    fields: [ { id: "analysis", value: "CONC", attributes: { direction: "in" } } ],
    children: [ result ]
});
const sample = new Limsml.Entity("sample",
{
    actions: [ { command: "result_entry" } ],
    fields: [ { id: "id_numeric", value: "712", attributes: { direction: "in" } } ],
    children: [ test ]
});
const request = new Limsml.Request({
    username: "SYSTEM", password: "", connect: Limsml.ConnectionType.StartSession
}, new Limsml.Transaction(
    new Limsml.System("system", sample)
));

console.log(util.inspect(request.getData(), false, null, true));
console.log(request.getXml({ pretty: true }));
*/

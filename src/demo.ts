import * as soap from 'soap';
import xml2js from 'xml2js';
import util from 'util';
import * as SampleManager from './SampleManager';

async function doStuff(promisedSession: Promise<SampleManager.Session>) {
    let session = await promisedSession;

    let menu = await session.getLoginMenu();
    console.log(menu);

    await session.end();
}

const url = 'http://localhost:56104/wsdl?wsdl';
const server = new SampleManager.Server(url);
const session = server.start("SYSTEM", "");

doStuff(session);

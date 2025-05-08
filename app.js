 const net = require('net');
const fs = require('fs');

console.log('Client started');

const HOST = '127.0.0.1';
const PORT = 3000;

const CALL_TYPE_STREAM_ALL = 1;
const CALL_TYPE_RESEND = 2;

let receivedTCPDataPackets = new Map();

function processTCPDataPackets(buffer) {
    const TCPDataPacketsize = 17;
    let TCPDataPackets = [];

    for (let i = 0; i < buffer.length; i += TCPDataPacketsize) {
        const slice = buffer.slice(i, i + TCPDataPacketsize);

        if (slice.length < TCPDataPacketsize) break;

        const symbol = slice.slice(0, 4).toString('ascii');
        const side = slice.slice(4, 5).toString('ascii');
        const quantity = slice.readInt32BE(5);
        const price = slice.readInt32BE(9);
        const sequence = slice.readInt32BE(13);

        TCPDataPackets.push({ symbol, side, quantity, price, sequence });
    }

    return TCPDataPackets;
}

function requestAllTCPDataPackets(callback) {   
    const client = new net.Socket();
    let allData = Buffer.alloc(0);

    client.connect(PORT, HOST, () => {
        const payload = Buffer.alloc(2);
        payload.writeUInt8(CALL_TYPE_STREAM_ALL, 0);
        payload.writeUInt8(0, 1);
        client.write(payload);
    });

    client.on('data', (chunk) => {
        allData = Buffer.concat([allData, chunk]);
    });

    client.on('end', () => {
        const TCPDataPackets = processTCPDataPackets(allData);
        TCPDataPackets.forEach(pkt => {
            receivedTCPDataPackets.set(pkt.sequence, pkt);
        });
        callback();
        client.destroy();
    });

    client.on('error', err => {
        console.error('Error in requestAllTCPDataPackets:', err.message);
        callback();
        client.destroy();
    });
}

function requestMissingTCPDataPackets(missingSeqs, callback) {
    if (missingSeqs.length === 0) {
        writeOutputJSONFile();
        return callback();
    }

    let remaining = missingSeqs.length;

    missingSeqs.forEach(seq => {
        const client = new net.Socket();
        let response = Buffer.alloc(0);

        client.connect(PORT, HOST, () => {
            console.log(` Requesting missing packet: Seq ${seq}`);
            const payload = Buffer.alloc(2);
            payload.writeUInt8(CALL_TYPE_RESEND, 0);
            payload.writeUInt8(seq, 1);
            client.write(payload);
        });

        client.on('data', chunk => {
            response = Buffer.concat([response, chunk]);
             const TCPDataPackets = processTCPDataPackets(response);
            TCPDataPackets.forEach(pkt => {
                receivedTCPDataPackets.set(pkt.sequence, pkt);
                console.log(`Received missing packet: Seq ${pkt.sequence}`);
            });

            
            client.end();
        });

        client.on('end', () => {
            remaining--;

            if (remaining === 0) {
                writeOutputJSONFile();
                callback();
            }

            client.destroy();
        });

        client.on('error', err => {
            console.error(`❌ Error requesting Seq ${seq}:`, err.message);
            remaining--;
            if (remaining === 0) {
                writeOutputJSONFile();
                callback();
            }
            client.destroy();
        });
    });
}

function detectMissingTCPDataSequences() {
    const TCPDataSequences = Array.from(receivedTCPDataPackets.keys()).sort((a, b) => a - b);
    const missing = [];

    if (TCPDataSequences.length === 0) return missing;

    for (let i = TCPDataSequences[0]; i < TCPDataSequences[TCPDataSequences.length - 1]; i++) {
        if (!receivedTCPDataPackets.has(i)) {
            missing.push(i);
        }
    }

    return missing;
}

function writeOutputJSONFile() {
    const sortedTCPDataPackets = Array.from(receivedTCPDataPackets.values())
        .sort((a, b) => a.sequence - b.sequence);

    fs.writeFileSync('output.json', JSON.stringify(sortedTCPDataPackets, null, 2));
    console.log('All TCPDataPackets saved to output.json');
}

requestAllTCPDataPackets(() => {
    const missing = detectMissingTCPDataSequences();
    console.log('Missing TCPDataSequences:', missing);

    requestMissingTCPDataPackets(missing, () => {
        console.log(' All data fetching complete');
    });
});
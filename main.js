import { program } from 'commander';
import http from 'http';
import fs from 'fs/promises';
import { URL } from 'url';
import { XMLBuilder } from 'fast-xml-parser';

program
  .requiredOption('-i, --input <path>', 'path to the input JSON file')
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port');

program.parse(process.argv);
const options = program.opts();

const inputFilePath = options.input;
const HOST = options.host;
const PORT = options.port;

try {
  await fs.access(inputFilePath);
} catch (error) {
  console.error('Cannot find input file');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, `http://${HOST}:${PORT}`);
    const survivedQuery = reqUrl.searchParams.get('survived');
    const ageQuery = reqUrl.searchParams.get('age');

    const data = await fs.readFile(inputFilePath, 'utf8');
    const lines = data.split('\n'); 
    let passengers = [];

    for (const line of lines) {
      if (line.trim() !== '') { 
        try {
          passengers.push(JSON.parse(line)); 
        } catch (parseError) {
          console.warn('Could not parse line:', line, parseError);
        }
      }
    }

    if (survivedQuery === 'true') {
      passengers = passengers.filter((p) => p.Survived === "1");
    }

    let outputData = passengers.map((p) => {
      const passengerData = {
        name: p.Name,
        ticket: p.Ticket,
      };

      if (ageQuery === 'true') {
        passengerData.age = p.Age;
      }
      
      return passengerData;
    });
    
    const finalObject = {
      passengers: {
        passenger: outputData
      }
    };

    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
    });

    const xmlOutput = builder.build(finalObject);

    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xmlOutput);

  } catch (error) {
    console.error('Error processing request:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
  console.log(`Reading data from: ${inputFilePath}`);
});
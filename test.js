const {FileSniffer, asArray} = require('./index');

async function main() {

  const matches = await FileSniffer
	.create()
	.collect(asArray())
	.find(/Test/);

  console.log(matches);
}

main();

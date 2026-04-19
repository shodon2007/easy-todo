import yargs from 'yargs'
import { commands } from '../src/index.js'

const run = yargs(process.argv.slice(2))

for (const command of commands) {
  console.log(run.argv, process.argv.slice(2));
  run.command(command);
}
run.demandCommand(1, 'You need at least one command before moving on').help().argv

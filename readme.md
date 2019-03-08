# Leap network performance tests
These tests intend to estimate performance and load capacities of Leap network. They work through JSON RPC. Currently only `transfer` is being tested.
## How to run
1. Clone this repo
2. Run `yarn` in clonned repo
3. Install Artillery: `yarn global add artillery`
4. Install Expect plugin: `yarn global add artillery-plugin-expect`
5. Go to clonned repo `tests` and run: `artillery run artillery_transfer.yml`
## Payload
Example payload (with addresses funded on testnet): `tests\out.csv`
To create a new one use `tools\fundAddresses.js`:
- (*optional*) Change mnemonic phrase in the script
- (*optional*) Change output file in the script
- (*optional*) Change number of wallets in the script
- First wallet of the mnemonic must be funded manually, script will distribute funds to other walltes
- Run the script (`node tools\fundAddresses.js`), the output csv file will contain public and private keys that can be used as payload
## Configuration
Load paramters (`config.phases` section):
- `duration`: How long the script will run (in sec)
- `arrivalRate`: How many users will arrive per second
- `arrivalCount`: Total amount of users (to be used instead of `arrivalRate`)
- More phases can be added if needed
Payload is setup in `config.payload`
`config.variables` section:
- `amount`: amount of tokens to transfer (by each user)
- `color`: token color
- `startBlock` Block when test starts. Used to count number of blocks passed during the test. **Has to be set manually on each run**
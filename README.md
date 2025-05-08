# 📦 Betacrew Node.js Take Home Assignment

This project is a solution to Betacrew's TCP packet streaming assignment. It involves building a client that connects to a TCP server, receives streaming binary packets, detects missing sequences, and requests them again to finally write all packets to a JSON file in the correct order.

---

## 🚀 Features

- Connects to a TCP server and streams data
- Parses binary packets into JSON objects
- Detects missing sequences in packet stream
- Requests missing packets using sequence numbers
- Saves the complete, ordered data to `output.json`

---

## 🛠️ Requirements

- Node.js (v14 or higher)
- Git (to clone the repo)

## ⚙️ How to Run

### 1. Clone the Repo
```bash
git clone https://github.com/MV140601/betacrew-node-assignment.git
cd betacrew-node-assignment
```
### 2. Start the TCP Server
```bash
node betacrew_exchange_server/main.js
```
### 3. Run the Client
In a new terminal window:
```bash
node app.js
```


### Example/Sample Output
 Client started
 
Missing Sequences: [ 3, 10 ]


 Requesting missing packet: Seq 3


 Requesting missing packet: Seq 10


 Received missing packet: Seq 3


 Received missing packet: Seq 10


All packets saved to output.json


//make a simple semaphore for api calls with rateLimit

const Semaphore = function (max) {
    this.max = max;
    this.available = max;
    this.queue = [];
    }

    Semaphore.prototype.acquire = function () {

    if (this.available > 0) {
        this.available--;
        return Promise.resolve();
    
    } else {
        return new Promise((resolve) => {
        this.queue.push(resolve);
        });
    }

    }

    Semaphore.prototype.release = function () {
    if (this.queue.length > 0) {
        this.queue.shift()();
    } else {
        this.available++;
    }
    }

    const semaphore = new Semaphore(1);

    const getBalance = async (address) => {
    await semaphore.acquire();  
    try {
        const response = await axios.get(api.url + address);
        const data = response.data;
        numberOfRequests[api.id] += 1;
        linesFetched++;
        fs.writeFileSync(
        "./fetched.json",
        JSON.stringify({ linesFetched: linesFetched/2 })
        );
        return data.balance;
    }
    catch (error) {
        return 0;
    }
    finally {
        semaphore.release();
    }
    };

    const result = {
    BTC49: {
        address: address.BTC49,
        balance: 0,
    },
    BTC84: {
        address: address.BTC84,
        balance: 0,
    }
}

// Path: mneomics/semaphores.js
module.exports = {
    semaphore,
}
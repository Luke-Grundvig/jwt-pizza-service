const config = require('./config');
//const os = require('os');

/*
Http requests by method/minute - total, get, put, post, and delete
active users
authentication attemps/min successful and failed
cpu and memory usage percentage
pizzas - sold/min, creation failures, revenue/min
latency - service endpoint and pizza creation
*/

/*setInterval(() => {
  const cpuValue = Math.floor(Math.random() * 100) + 1;
  sendMetricToGrafana('cpu', cpuValue, 'gauge', '%');

  requests += Math.floor(Math.random() * 200) + 1;
  sendMetricToGrafana('requests', requests, 'sum', '1');

  latency += Math.floor(Math.random() * 200) + 1;
  sendMetricToGrafana('latency', latency, 'sum', 'ms');
}, 1000);*/

class Metrics {
    constructor() {
        this.total_http_requests = 0;
        this.get_requests = 0;
        this.put_requests = 0;
        this.post_requests = 0;
        this.delete_requests = 0;
        this.successAuth = 0;
        this.failedAuth = 0;
        this.activeUsers = 0;
    }

    requestTracker() {
        return (req, res, next) => {
            this.total_http_requests++;
            this.incrementSpecificRequest(req.method);
            next();
        }
    }

    incSuccessAuth() {
        this.successAuth++;
    }

    incFailAuth() {
        this.successAuth++;
    }

    incActiveUser() {
        this.activeUsers++;
    }

    decActiveUser() {
        this.activeUsers--;
    }

    incrementSpecificRequest(method) {
        switch(method) {
            case 'GET':
                this.get_requests++;
                break;
            case 'POST':
                this.post_requests++;
                break;
            case 'PUT':
                this.put_requests++;
                break;
            case 'DELETE':
                this.delete_requests++;
                break;
        }
    }




    sendMetricToGrafana(metrics) {
        const metric = {
          resourceMetrics: [
            {
              scopeMetrics: [
                {
                  metrics: metrics,
                },
              ],
            },
          ],
        };

        const body = JSON.stringify(metric);
        fetch(`${config.metrics.url}`, {
          method: 'POST',
          body: body,
          headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
        })
          .then((response) => {
            if (!response.ok) {
              response.text().then((text) => {
                console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
              });
            } else {
              console.log(`Pushed metrics`);
            }
          })
          .catch((error) => {
            console.error('Error pushing metrics:', error);
          });
      }
      
      
        /*getCpuUsagePercentage() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
      }
      
       getMemoryUsagePercentage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        return memoryUsage.toFixed(2);
      }*/
      
       sendMetricsPeriodically(period) {
          const timer = setInterval(() => {
            try {
              const buf = new MetricBuilder();
              this.httpMetrics(buf);
              //systemMetrics(buf);
              //userMetrics(buf);
              //purchaseMetrics(buf);
              //authMetrics(buf);
        
              //const metrics = buf.toString('\n');
              this.sendMetricToGrafana(buf.metrics);
            } catch (error) {
              console.log('Error sending metrics', error);
            }
          }, period);
          timer.unref();
        }

        httpMetrics(buf) {
            buf.addMetric("total_http_requests", this.total_http_requests, 'sum', '1');
            buf.addMetric("get_requests", this.get_requests, 'sum', '1');
            buf.addMetric("put_requests", this.put_requests, 'sum', '1');
            buf.addMetric("post_requests", this.post_requests, 'sum', '1');
            buf.addMetric("delete_requests", this.delete_requests, 'sum', '1');
        }
}

class MetricBuilder {
    constructor() {
        this.metrics = [];
    }

    addMetric(name, value, type, unit) {
        const metric = {
            name: name,
            unit: unit,
            [type]: {
              dataPoints: [
                {
                  asInt: value,
                  timeUnixNano: Date.now() * 1000000,
                  attributes: [
                    {
                        key: "source",
                        value: {stringValue: config.metrics.source}
                    }
                  ]
                },
              ],
            },
          }

        if (type === 'sum') {
            metric[type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
            metric[type].isMonotonic = true;
          }
        this.metrics.push(metric);
    }
}

const metrics = new Metrics();
metrics.sendMetricsPeriodically(1000);
//metrics.sendMetricsPeriodically(100000);
module.exports = metrics;
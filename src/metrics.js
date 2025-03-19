const config = require('./config');
const os = require('os');

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

        this.pizzasSold = 0;
        this.revenue = 0.0;
        this.creationFailures = 0;

        this.requestLatency = 0.0;
        this.creationLatency = 0.0;
    }

    requestTracker() {
        return (req, res, next) => {
            const startTime = Date.now();
    
            res.on('finish', () => {
                const latency = Date.now() - startTime;
                this.requestLatency = latency;
            });
    
            this.total_http_requests++;
            this.incrementSpecificRequest(req.method);
            next();
        };
    }

    pizzaTransaction(pizzasSold, revenue, failed, latency) {
        this.pizzasSold += pizzasSold;
        this.revenue += revenue;
        if (failed) {
            this.creationFailures++;
        }
        this.creationLatency = latency;
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
      
      
        getCpuUsagePercentage() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
        }
      
       getMemoryUsagePercentage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        return memoryUsage.toFixed(2);
        }
      
       sendMetricsPeriodically(period) {
          const timer = setInterval(() => {
            try {
              const buf = new MetricBuilder();
              this.httpMetrics(buf);
              this.systemMetrics(buf);
              this.userMetrics(buf);
              this.purchaseMetrics(buf);
              this.authMetrics(buf);
        
              this.sendMetricToGrafana(buf.metrics);
            } catch (error) {
              console.log('Error sending metrics', error);
            }
          }, period);
          timer.unref();
        }

        userMetrics(buf) {
            buf.addMetric("creation_latency", this.creationLatency, 'histogram', 'ms');
            buf.addMetric("request_latency", this.requestLatency, 'histogram', 'ms');
        }

        purchaseMetrics(buf) {
            buf.addMetric("pizzas_sold", this.pizzasSold, 'sum', '1');
            buf.addMetric("revenue", this.revenue, 'sum', '1');
            buf.addMetric("creation_failures", this.creationFailures, 'sum', '1');
        }

        systemMetrics(buf) {
            buf.addMetric("cpu_usage", this.getCpuUsagePercentage(), 'gauge', '%');
            buf.addMetric("memory_usage", this.getMemoryUsagePercentage(), 'gauge', '%');
        }

        authMetrics(buf) {
            buf.addMetric("success_auth", this.successAuth, 'sum', '1');
            buf.addMetric("failed_auth", this.failedAuth, 'sum', '1');
            buf.addMetric("active_users", this.activeUsers, 'sum', '1');
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
                  asDouble: value,
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
          } else if (type === 'histogram') {
            metric[type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_DELTA';
        }
        
        this.metrics.push(metric);
    }
}

const metrics = new Metrics();
metrics.sendMetricsPeriodically(5000);
module.exports = metrics;
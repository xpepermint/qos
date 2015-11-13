module.exports = function(time, ctx) {
  console.log(`Processing job with time ${time}.`);
  console.log(`this.foo`, this.foo);
  console.log(`ctx.foo`, ctx.foo);
  return Promise.resolve();
};

export function retrySend(sendReq, maxAttempts = 8) {
  let attempt = 0;
  function makeAttempt() {
    if (attempt >= maxAttempts) {
      console.log('Max attempts reached');
      return;
    }
    const delay = Math.pow(2, attempt) * 15000;
    console.log(`Retry attempt ${attempt + 1}`);
    attempt++;
    sendReq();
    return setTimeout(makeAttempt, delay);
  }
  return makeAttempt();
}

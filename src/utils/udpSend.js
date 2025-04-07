export const udpSend = (
  socket,
  message,
  url,
  callback = err => {
    console.log({ udp_send_error: err });
  }
) => {
  socket.send(
    message,
    0,
    message.length,
    url.port || 80,
    url.hostname,
    callback
  );
};

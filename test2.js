async function run() {
  try {
    const res = await fetch('http://[::1]:8080/api/employees/123/face-embeddings', { method: 'DELETE' });
    console.log(res.status, await res.text());
  } catch (err) {
    console.error("FETCH ERROR CAUSE:", err);
  }
}
run();

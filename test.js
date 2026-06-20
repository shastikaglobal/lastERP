async function run() {
  try {
    const res = await fetch('http://127.0.0.1:8080/api/employees/face-embeddings', { method: 'POST', body: '{}', headers: {'Content-Type': 'application/json'} });
    console.log(res.status, await res.text());
  } catch (err) {
    console.error("FETCH ERROR CAUSE:", err.cause);
  }
}
run();

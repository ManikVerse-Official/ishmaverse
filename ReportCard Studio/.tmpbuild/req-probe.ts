try {
  console.log('require type:', typeof require);
} catch (e) {
  console.log('require not defined:', (e as Error).message);
}
console.log('import.meta.url:', typeof (import.meta as any)?.url);

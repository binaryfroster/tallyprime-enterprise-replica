import { createTallyServer } from './core/port9000Server';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 9000;
const app = createTallyServer();

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  TallyPrime Replica Server Running on Port ${PORT}`);
  console.log(`  - Standard Port 9000 XML Gateway: http://localhost:${PORT}/`);
  console.log(`  - REST API Base: http://localhost:${PORT}/api/`);
  console.log(`================================================================`);
});

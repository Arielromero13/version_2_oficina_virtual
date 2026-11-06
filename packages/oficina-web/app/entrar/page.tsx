import { accesoConfigurado } from "@/lib/auth";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="entrar">
      <form className="tarjeta-entrar" method="post" action="/api/entrar">
        <p className="etiqueta">Oficina Virtual de Ingeniería</p>
        <h1>Entrar a la oficina</h1>
        {!process.env.OFICINA_USUARIO && (
          <p className="aviso" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
            Credenciales de acceso: usuario <strong>admin</strong>, clave <strong>admin</strong>.
          </p>
        )}
        {error && <p className="aviso">Usuario o clave incorrectos.</p>}
        <label>
          Usuario
          <input name="usuario" autoComplete="username" defaultValue={process.env.OFICINA_USUARIO ? "" : "admin"} required />
        </label>
        <label>
          Clave
          <input name="clave" type="password" autoComplete="current-password" defaultValue={process.env.OFICINA_USUARIO ? "" : "admin"} required />
        </label>
        <button className="boton-primario" type="submit">Entrar</button>
      </form>
    </main>
  );
}

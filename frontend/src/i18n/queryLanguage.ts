// Solo español (S01): el parámetro ?lang= se ignora; la interfaz ya no
// cambia de idioma por consulta.
// Decisión S01 (?lang= removido, no forzado a español): esta función siempre
// devuelve undefined para que ninguna ruta condicione el idioma por consulta.
// S03 borra los lectores directos restantes (lógica del landing, Landing y
// layouts) sin redirección; ningún llamado productivo usa este ayudante hoy.
// S04 simplifica la firma: ya no menciona el idioma.

export function languageFromQuery(_search: string): undefined {
  return undefined;
}

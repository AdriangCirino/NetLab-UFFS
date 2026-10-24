// O progresso fica somente em memória: recarregar a página inicia outra rodada.
// A próxima missão só é liberada após a conclusão da missão atual.
export function nextMissionIndex(index, completed, total) {
  if (!completed || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total - 1) return index;
  return index + 1;
}

export function mayResetMission(completed) {
  return !completed;
}

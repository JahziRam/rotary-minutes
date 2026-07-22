export type AgendaItemInput = {
  id?: string;
  title: string;
  description: string;
  decisions: string;
  actions: string;
  responsible: string;
  dueDate: string | null;
  status: string;
};

export type AgendaItemRow = {
  id: string;
  sortOrder: number;
};

export function diffAgendaItemOperations(
  existing: AgendaItemRow[],
  incoming: AgendaItemInput[]
): {
  keepIds: string[];
  updateItems: Array<AgendaItemInput & { sortOrder: number }>;
  createItems: Array<AgendaItemInput & { sortOrder: number }>;
  deleteIds: string[];
} {
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const keepIds: string[] = [];
  const updateItems: Array<AgendaItemInput & { sortOrder: number }> = [];
  const createItems: Array<AgendaItemInput & { sortOrder: number }> = [];

  for (const [index, item] of incoming.entries()) {
    const id = item.id?.trim();
    if (id && existingById.has(id)) {
      keepIds.push(id);
      updateItems.push({ ...item, sortOrder: index });
      existingById.delete(id);
    } else {
      createItems.push({ ...item, sortOrder: index });
    }
  }

  const deleteIds = Array.from(existingById.keys());
  return { keepIds, updateItems, createItems, deleteIds };
}

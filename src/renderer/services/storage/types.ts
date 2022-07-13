// =====================================================
// ================ Storage interface ==================
// =====================================================

export interface IStorage {
  getTestById: (id: string) => Promise<Test | undefined>;
}

// =====================================================
// ================== Storage Schemes ==================
// =====================================================
interface WithID {
  id: string;
}

export interface Test extends WithID {
  name: string;
}

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface SavedADMemo {
  id: string
  adNumber: number
  agencyCode: string
  agencyName: string | null
  voucherNumber: string | null
  lrNumber: string | null
  lrDate: string
  image: string[]
  createdBy: string
  createdAt: string
  generatedDate: string
}

export interface CreateMemoData {
  agencyCode: string
  voucherNumber?: string
  lrNumber?: string
  lrDate: string
  image: string[]
  generatedDate: string
}

export interface UpdateMemoData extends CreateMemoData {
  adNumber: number
}

interface AgencyDeliveryMemoState {
  memos: SavedADMemo[]
  isLoading: boolean
  isSaving: boolean

  selectedDate: Date | null
  agencyFilter: string
  searchTerm: string
  currentPage: number
  itemsPerPage: number

  fetchMemos: () => Promise<void>
  saveMemo: (data: CreateMemoData) => Promise<void>
  updateMemo: (data: UpdateMemoData) => Promise<void>
  resetMemo: (adNumber: number) => Promise<void>

  setSelectedDate: (d: Date | null) => void
  setAgencyFilter: (c: string) => void
  setSearchTerm: (t: string) => void
  setCurrentPage: (p: number) => void
  clearFilters: () => void
}

export const useAgencyDeliveryMemoStore = create<AgencyDeliveryMemoState>()(
  devtools(
    (set, get) => ({
      memos: [],
      isLoading: false,
      isSaving: false,
      selectedDate: new Date(),
      agencyFilter: '',
      searchTerm: '',
      currentPage: 1,
      itemsPerPage: 20,

      setSelectedDate: (d) => {
        set({ selectedDate: d, currentPage: 1 });
        get().fetchMemos();
      },

      setAgencyFilter: (c) => set({ agencyFilter: c, currentPage: 1 }),

      setSearchTerm: (t) => set({ searchTerm: t, currentPage: 1 }),

      setCurrentPage: (p) => set({ currentPage: p }),

      clearFilters: () => {
        set({ selectedDate: new Date(), agencyFilter: '', searchTerm: '', currentPage: 1 });
        get().fetchMemos();
      },

      fetchMemos: async () => {
        set({ isLoading: true });
        try {
          const { selectedDate, agencyFilter } = get();
          const url = new URL('/api/agency-delivery-memo', window.location.origin);
          if (selectedDate) {
            url.searchParams.set('date', new Date(selectedDate).toISOString().split('T')[0]);
          }
          if (agencyFilter) {
            url.searchParams.set('agencyCode', agencyFilter);
          }

          const res = await fetch(url.toString());
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.message || 'Failed to fetch');

          const mapped: SavedADMemo[] = json.data.map((m: any) => ({
            id: m.id,
            adNumber: m.adNumber,
            agencyCode: m.agencyCode,
            agencyName: m.agency?.companyName || m.agency?.shortName || null,
            voucherNumber: m.voucherNumber || null,
            lrNumber: m.lrNumber || null,
            lrDate: m.lrDate,
            image: m.image || [],
            createdBy: m.createdBy,
            createdAt: m.createdAt,
            generatedDate: m.generatedDate,
          }));

          set({ memos: mapped, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      saveMemo: async (data) => {
        set({ isSaving: true });
        try {
          const res = await fetch('/api/agency-delivery-memo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agencyCode: data.agencyCode,
              voucherNumber: data.voucherNumber || undefined,
              lrNumber: data.lrNumber || undefined,
              lrDate: new Date(data.lrDate).toISOString(),
              image: data.image,
              generatedDate: new Date(data.generatedDate).toISOString(),
            })
          });

          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save');

          const m = json.data;
          const newMemo: SavedADMemo = {
            id: m.id,
            adNumber: m.adNumber,
            agencyCode: m.agencyCode,
            agencyName: m.agency?.companyName || m.agency?.shortName || null,
            voucherNumber: m.voucherNumber || null,
            lrNumber: m.lrNumber || null,
            lrDate: m.lrDate,
            image: m.image || [],
            createdBy: m.createdBy,
            createdAt: m.createdAt,
            generatedDate: m.generatedDate,
          };

          set((state) => ({
            memos: [newMemo, ...state.memos],
            isSaving: false,
          }));
        } catch (error) {
          set({ isSaving: false });
          throw error;
        }
      },

      updateMemo: async (data) => {
        set({ isSaving: true });
        try {
          const res = await fetch('/api/agency-delivery-memo', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adNumber: data.adNumber,
              agencyCode: data.agencyCode,
              voucherNumber: data.voucherNumber || undefined,
              lrNumber: data.lrNumber || undefined,
              lrDate: new Date(data.lrDate).toISOString(),
              image: data.image,
              generatedDate: new Date(data.generatedDate).toISOString(),
            })
          });

          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update');

          const m = json.data;
          const updated: SavedADMemo = {
            id: m.id,
            adNumber: m.adNumber,
            agencyCode: m.agencyCode,
            agencyName: m.agency?.companyName || m.agency?.shortName || null,
            voucherNumber: m.voucherNumber || null,
            lrNumber: m.lrNumber || null,
            lrDate: m.lrDate,
            image: m.image || [],
            createdBy: m.createdBy,
            createdAt: m.createdAt,
            generatedDate: m.generatedDate,
          };

          set((state) => ({
            memos: state.memos.map((memo) => memo.adNumber === updated.adNumber ? updated : memo),
            isSaving: false,
          }));
        } catch (error) {
          set({ isSaving: false });
          throw error;
        }
      },

      resetMemo: async (adNumber) => {
        set({ isLoading: true });
        try {
          const res = await fetch(`/api/agency-delivery-memo?adNumber=${adNumber}`, { method: 'DELETE' });
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.message || 'Failed to reset');

          set((state) => ({
            memos: state.memos.filter((m) => m.adNumber !== adNumber),
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    { name: 'agency-delivery-memo-store' }
  )
);

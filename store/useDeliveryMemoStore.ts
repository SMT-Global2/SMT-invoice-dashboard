import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import moment from 'moment'

export interface DeliveryMemoData {
  dmNumber: number
  partyCode: string | null
  medicalName: string
  city: string
  regionalCode: string
  generatedDate: Date | null
  goodsCollectedUsername: string | null
  goodsCollectedTimestamp: Date | null
  goodsCheckedUsername: string | null
  goodsCheckedTimestamp: Date | null
  isDisabled: boolean
  _tempCollected?: boolean  // UI-only state for marking collected before saving
  _tempChecked?: boolean    // UI-only state for marking checked before saving
  images?: string[]         // Store the uploaded image keys
}

interface DeliveryMemoState {
  deliveryMemos: DeliveryMemoData[]
  selectedDate: Date | undefined
  currentPage: number
  itemsPerPage: number
  isLoading: boolean
  error: string | null
  dmStartNo: number
  dmEndNo: number | null
  checkingMode: boolean
  
  // Regional code filters
  selectedRegionalCodes: string[]
  availableRegionalCodes: string[]
  dmSearchTerm: string

  // Actions
  setDeliveryMemos: (deliveryMemos: DeliveryMemoData[]) => void
  setSelectedDate: (date: Date | undefined) => void
  setCurrentPage: (page: number) => void
  setCheckingMode: (mode: boolean) => void
  setDmSearchTerm: (term: string) => void
  
  // Regional code actions
  setSelectedRegionalCodes: (codes: string[]) => void
  fetchAvailableRegionalCodes: () => Promise<void>
  clearAllFilters: () => void

  handleDeliveryMemos: () => Promise<void>
  fetchDeliveryMemos: (date?: Date | null) => Promise<void>
  saveDeliveryMemo: (dmNumber: number, isCollected: boolean) => Promise<void>
  checkDeliveryMemo: (dmNumber: number, isChecked: boolean) => Promise<void>
  resetDeliveryMemo: (dmNumber: number , isChecked: boolean) => Promise<void>
  updateDeliveryMemoImage: (dmNumber: number, image: string) => void
  saveDeliveryMemoWithCustomUser: (dmNumber: number, username: string) => Promise<void>
}

export const useDeliveryMemoStore = create<DeliveryMemoState>()(
  devtools(
    (set, get) => ({
      deliveryMemos: [],
      dmStartNo: -1,
      dmEndNo: null,
      selectedDate: moment().startOf('day').toDate(),
      currentPage: 1,
      itemsPerPage: 100,
      isLoading: false,
      error: null,
      checkingMode: false,
      dmSearchTerm: '',
      
      // Regional code filters
      selectedRegionalCodes: [],
      availableRegionalCodes: [],

      setDeliveryMemos: (deliveryMemos) => set({ deliveryMemos }),
      setSelectedDate: (date) => {
        if (moment(date).isAfter(moment(), 'day')) {
          return;
        }
        set({ selectedDate: date });
        get().fetchDeliveryMemos(date);
      },
      setCurrentPage: (page) => set({ currentPage: page }),
      setCheckingMode: (mode) => {
        set({ checkingMode: mode });
        get().fetchDeliveryMemos();
      },
      setDmSearchTerm: (term) => set({ dmSearchTerm: term }),
      
      setSelectedRegionalCodes: (codes) => {
        set({ selectedRegionalCodes: codes });
        if (codes.length === 0) {
          get().handleDeliveryMemos();
        } else {
          get().fetchDeliveryMemos();
        }
      },
      
      fetchAvailableRegionalCodes: async () => {
        try {
          const response = await fetch('/api/party/regionalCodes');
          if (!response.ok) {
            throw new Error('Failed to fetch regional codes');
          }
          const data = await response.json();
          set({ availableRegionalCodes: data.regionalCodes || [] });
        } catch (error) {
          console.error('Error fetching regional codes:', error);
        }
      },
      
      clearAllFilters: () => {
        set({
          selectedRegionalCodes: [],
          selectedDate: moment().startOf('day').toDate(),
          dmSearchTerm: '',
        });
        get().handleDeliveryMemos();
      },
      
      updateDeliveryMemoImage: (dmNumber, image) => {
        // Update the delivery memo with the image key
        const updatedDeliveryMemos = get().deliveryMemos.map(d => {
          if (d.dmNumber === dmNumber) {
            const currentImages = d.images || [];
            return {
              ...d,
              images: [...currentImages, image]
            };
          }
          return d;
        });
        set({ deliveryMemos: updatedDeliveryMemos });
      },

      fetchDeliveryMemos: async (date = get().selectedDate) => {
        try {
          set({ isLoading: true, error: null });
          const url = new URL('/api/deliverymemo', window.location.origin);
          if (date) {
            url.searchParams.set('date', moment(date).format('YYYY-MM-DD'));
          }
          if (get().checkingMode) {
            url.searchParams.set('checkingMode', 'true');
          }
          
          // Add regional codes to the request if any are selected
          const { selectedRegionalCodes } = get();
          if (selectedRegionalCodes.length > 0) {
            url.searchParams.set('regionalCodes', selectedRegionalCodes.join(','));
          }
          
          const response = await fetch(url.toString());
          const { data } = await response.json();
          
          // Map the database image array to our interface property
          const mappedData = data.map((item: any) => ({
            ...item,
            medicalName: item.party?.customerName || '-',
            city: item.party?.city || '-',
            regionalCode: item.party?.regionalCode || '-',
            images: item.image || []
          }));
          
          set({ deliveryMemos: mappedData, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch delivery memos', isLoading: false });
        }
      },

      handleDeliveryMemos: async () => {
        try {
          set({ isLoading: true, error: null });

          const date = get().selectedDate ?? new Date();
          const HANDLE_LIMIT = 999;

          // Skip if in checking mode - we only need to show collected items
          if (get().checkingMode) {
            await get().fetchDeliveryMemos(date);
            set({ isLoading: false });
            return;
          }

          // Get DM start number
          const [startNoResponse, todayResponse] = await Promise.all([
            fetch('/api/deliverymemo/startNo?date=' + moment(date).format('YYYY-MM-DD')),
            fetch('/api/deliverymemo?date=' + moment(date).format('YYYY-MM-DD'))
          ]);

          const {
            dmStartNo,
            dmEndNo
          } = await startNoResponse.json();
          
          if (!dmStartNo) {
            set({ error: 'Failed to get delivery memo start number', isLoading: false });
            return;
          }

          set({ dmStartNo: dmStartNo, dmEndNo: dmEndNo });

          // Get today's delivery memos
          const { data: todayDeliveryMemos } = await todayResponse.json();

          // Logic for current number
          let currentNo = dmStartNo;

          const finalDeliveryMemos: DeliveryMemoData[] = [];

          let maximumDmNumber = dmEndNo ? dmEndNo : dmStartNo + HANDLE_LIMIT;

          if (moment(date).isSame(moment(), 'day')) {
            maximumDmNumber = Math.max(maximumDmNumber, dmStartNo + HANDLE_LIMIT);
          }

          for (let i = dmStartNo; i <= maximumDmNumber; i++) {
            const existingDM = todayDeliveryMemos.find(
              (item: any) => item.dmNumber === currentNo
            );

            if (existingDM) {
              finalDeliveryMemos.push({
                ...existingDM,
                medicalName: existingDM.party.customerName || '-',
                city: existingDM.party.city || '-',
                regionalCode: existingDM.party.regionalCode || '-',
                images: existingDM.image || [],
              });
            } else if (
              moment(date).isSame(moment(), 'day')
            ) {
              finalDeliveryMemos.push({
                dmNumber: currentNo,
                generatedDate: moment(date).startOf('day').toDate(),
                partyCode: null,
                medicalName: '-',
                city: '-',
                regionalCode: '-',
                goodsCollectedUsername: null,
                goodsCollectedTimestamp: null,
                goodsCheckedUsername: null,
                goodsCheckedTimestamp: null,
                isDisabled: (
                  // Disabled if date is 3 days ago
                  moment(date).isSame(moment().subtract(3, 'days'), 'day')
                )
              });
            } else if (dmEndNo) {
              finalDeliveryMemos.push({
                dmNumber: currentNo,
                generatedDate: moment(date).startOf('day').toDate(),
                partyCode: null,
                medicalName: '-',
                city: '-',
                regionalCode: '-',
                goodsCollectedUsername: null,
                goodsCollectedTimestamp: null,
                goodsCheckedUsername: null,
                goodsCheckedTimestamp: null,
                isDisabled: (
                  // Disabled if date is 3 days ago
                  moment(date).isSame(moment().subtract(3, 'days'), 'day')
                )
              });
            }
  
            currentNo++;
          }

          set({ deliveryMemos: finalDeliveryMemos, isLoading: false });

        } catch (error) {
          console.error('Error handling delivery memos:', error);
          set({
            error: 'Failed to process delivery memos',
            isLoading: false
          });
        }
      },

      saveDeliveryMemo: async (dmNumber: number, isCollected: boolean) => {
        try {
          set({ isLoading: true });
          
          const dm = get().deliveryMemos.find(d => d.dmNumber === dmNumber);
          const date = get().selectedDate;

          if (!dm) {
            throw new Error('Delivery memo not found');
          }

          if (!dm.partyCode) {
            throw new Error('Party code is required');
          }

          const dmToSave = {
            dmNumber: dm.dmNumber,
            generatedDate: date,
            partyCode: dm.partyCode,
          };

          const response = await fetch('/api/deliverymemo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dmToSave),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save delivery memo');
          }

          const { data } = await response.json();

          const updatedDeliveryMemos = get().deliveryMemos.map(d => 
            d.dmNumber === dmNumber ? {
              ...d,
              ...data,
              medicalName: data.party.customerName || '-',
              city: data.party.city || '-',
              images: data.image || []
            } : d
          );

          set({ deliveryMemos: updatedDeliveryMemos, isLoading: false });

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save delivery memo',
            isLoading: false
          });
          throw error;
        }
      },

      saveDeliveryMemoWithCustomUser: async (dmNumber: number, username: string) => {
        try {
          set({ isLoading: true });
          
          const dm = get().deliveryMemos.find(d => d.dmNumber === dmNumber);
          const date = get().selectedDate;

          if (!dm) {
            throw new Error('Delivery memo not found');
          }

          if (!dm.partyCode) {
            throw new Error('Party code is required');
          }

          const dmToSave = {
            dmNumber: dm.dmNumber,
            generatedDate: date,
            partyCode: dm.partyCode,
            username: username
          };

          const response = await fetch('/api/deliverymemo/custom', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dmToSave),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save delivery memo');
          }

          const { data } = await response.json();

          const updatedDeliveryMemos = get().deliveryMemos.map(d => 
            d.dmNumber === dmNumber ? {
              ...d,
              ...data,
              medicalName: data.party.customerName || '-',
              city: data.party.city || '-',
              images: data.image || []
            } : d
          );

          set({ deliveryMemos: updatedDeliveryMemos, isLoading: false });

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save delivery memo with custom user',
            isLoading: false
          });
          throw error;
        }
      },

      checkDeliveryMemo: async (dmNumber: number, isChecked: boolean) => {
        try {
          set({ isLoading: true });
          
          const dm = get().deliveryMemos.find(d => d.dmNumber === dmNumber);
          
          if (!dm) {
            throw new Error('Delivery memo not found');
          }

          // if (!dm.images || dm.images.length === 0) {
          //   throw new Error('At least one image is required for checking');
          // }

          const response = await fetch('/api/deliverymemo', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              dmNumber,
              image: dm.images 
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to check delivery memo');
          }

          const { data } = await response.json();

          const updatedDeliveryMemos = get().deliveryMemos.map(d => 
            d.dmNumber === dmNumber ? {
              ...d,
              ...data,
              medicalName: data.party.customerName || '-',
              city: data.party.city || '-',
              images: data.image || []
            } : d
          );

          set({ deliveryMemos: updatedDeliveryMemos, isLoading: false });

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to check delivery memo',
            isLoading: false
          });
          throw error;
        }
      },

      resetDeliveryMemo: async (dmNumber: number , isChecked: boolean = false) => {
        try {
          set({ isLoading: true });
          
          const dm = get().deliveryMemos.find(d => d.dmNumber === dmNumber);
          
          if (!dm) {
            throw new Error('Delivery memo not found');
          }

          if (dm.goodsCollectedTimestamp ) {
            const response = await fetch(`/api/deliverymemo?dmNumber=${dmNumber}` + (isChecked ? '&isChecked=true' : ''), {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to reset delivery memo');
            }
          }

          await get().handleDeliveryMemos();

          set({ isLoading: false });

        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to reset delivery memo',
            isLoading: false
          });
          throw error;
        }
      },
    }),
    {
      name: 'delivery-memo-store'
    }
  )
)

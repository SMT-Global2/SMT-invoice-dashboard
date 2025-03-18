'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { DeliveryMemoData, useDeliveryMemoStore } from '@/store/useDeliveryMemoStore';
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from '@/components/ui/use-toast';
import { compressImage, convertImage, tweleHrFormatDateString, uploadFileToS3 } from '@/lib/helper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import moment from 'moment';
import { Capsule } from '@/components/capsule';
import TableSkeleton from '@/components/table-skeleton';
import { TableEmpty } from '@/components/TableEmpty';
import { Spinner } from '@/components/icons';
import { TakeImage } from '@/components/take-image';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { debounce } from 'lodash';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShowImage } from '@/components/show-image';
import { PartyCodeSelector, PartyCode } from '@/components/party-code-selector';

export default function DeliveryMemoPage() {
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [lastInteractedDm, setLastInteractedDm] = useState<number | null>(null);
  const { toast } = useToast();
  const [dmSearchTerm, setDmSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("collection");

  const {
    deliveryMemos,
    selectedDate,
    currentPage,
    itemsPerPage,
    isLoading,
    checkingMode,
    setDeliveryMemos,
    setSelectedDate,
    setCurrentPage,
    setCheckingMode,
    updateDeliveryMemoImage,
    saveDeliveryMemo,
    checkDeliveryMemo,
    resetDeliveryMemo,
    handleDeliveryMemos,
  } = useDeliveryMemoStore();

  useEffect(() => {
    setCheckingMode(activeTab === "checking");
    handleDeliveryMemos();
  }, [handleDeliveryMemos, selectedDate, activeTab, setCheckingMode]);

  const handleImageUpload = (dmNumber: number) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLastInteractedDm(dmNumber);
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingImage(dmNumber);

      const changedFile = await convertImage(file);
      const compressedFile = await compressImage(changedFile);
      const uploadedImage = await uploadFileToS3(compressedFile, dmNumber.toString());

      // Update the image in the store
      updateDeliveryMemoImage(dmNumber, uploadedImage.key);

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
        duration: 2000,
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        duration: 2000,
      });
    } finally {
      setUploadingImage(null);
      event.target.value = '';
    }
  };

  const handlePartyCodeSelect = (dm: DeliveryMemoData, partyCode: PartyCode) => {
    setLastInteractedDm(dm.dmNumber);
    const newData = [...deliveryMemos];
    const index = newData.findIndex(item => item.dmNumber === dm.dmNumber);
    if (index !== -1) {
      newData[index] = {
        ...newData[index],
        partyCode: partyCode.code,
        medicalName: partyCode.customerName || '-',
        city: partyCode.city || '-',
      };
      setDeliveryMemos(newData);
    }
  };

  const handleReset = async (dmNumber: number , isChecked: boolean = false) => {
    try {
      setLastInteractedDm(dmNumber);
      await resetDeliveryMemo(dmNumber , isChecked);
      toast({
        title: 'Success',
        description: 'Delivery memo reset successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to reset delivery memo:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to reset delivery memo',
        duration: 2000,
      });
    }
  };

  const handleSave = async (dmNumber: number) => {
    try {
      setLastInteractedDm(dmNumber);
      await saveDeliveryMemo(dmNumber, true);
      toast({
        title: 'Success',
        description: 'Delivery memo saved successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Delivery memo not saved',
        duration: 2000,
      });
    }
  }

  const handleCheck = async (dmNumber: number) => {
    try {
      setLastInteractedDm(dmNumber);
      
      // Find the delivery memo
      const dm = deliveryMemos.find(d => d.dmNumber === dmNumber);
      
      if (!dm) {
        throw new Error('Delivery memo not found');
      }
      
      // Check if image is uploaded
      if (!dm.images || dm.images.length === 0) {
        throw new Error('Please upload at least one image before checking');
      }
      
      await checkDeliveryMemo(dmNumber, true);
      toast({
        title: 'Success',
        description: 'Delivery memo checked successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Check error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Delivery memo not checked',
        duration: 2000,
      });
    }
  }

  // Update filtering logic for delivery memos based on DM search term
  const filteredDeliveryMemos = deliveryMemos.filter(dm => 
    dm.dmNumber.toString().includes(dmSearchTerm.trim())
  );

  const totalPages = Math.ceil(filteredDeliveryMemos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDeliveryMemos = filteredDeliveryMemos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getDeliveryMemoStatus = (dm: DeliveryMemoData) => {
    if (dm.goodsCheckedUsername) {
      return (
        <Capsule
          text='Checked'
          bgColor='bg-green-100'
          textColor='text-green-700'
          showIcon='ok'
        />
      );
    } else if (dm.goodsCollectedUsername) {
      return (
        <Capsule
          text='Collected'
          bgColor='bg-blue-100'
          textColor='text-blue-700'
          showIcon='ok'
        />
      );
    } else {
      return (
        <Capsule
          text='Pending'
          bgColor='bg-red-100'
          textColor='text-red-700 font-sm'
          showIcon='cross'
        />
      );
    }
  };

  return (
    <div className="space-y-4 overflow-hidden max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mt-2">
      <Tabs defaultValue="collection" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="checking">Checking</TabsTrigger>
        </TabsList>

        <TabsContent value="collection">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Collection</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Search DM number..."
                      value={dmSearchTerm}
                      onChange={(e) => setDmSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <DatePicker date={selectedDate} setDate={setSelectedDate} />
                    <Button
                      variant={'outline'}
                      disabled={!selectedDate || moment(selectedDate).isSame(moment(), 'day')}
                      onClick={() => setSelectedDate(moment().startOf('day').toDate())}
                    >Clear Date</Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>DM No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Party Code</TableHead>
                      <TableHead>Medical Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Collected Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && deliveryMemos?.length === 0 ? (
                      <TableSkeleton rows={5} cols={10} />
                    ) : !moment(selectedDate).isSame(moment(), 'day') && deliveryMemos.length === 0 ? (
                      <TableEmpty
                        text='No delivery memos created on this date'
                      />
                    ) : (
                      currentDeliveryMemos.map((row, i) => (
                        <TableRow key={row.dmNumber}
                          className={cn(
                            "border-gray-400",
                            lastInteractedDm === row.dmNumber && "border-[2px] border-yellow-300"
                          )}
                        >
                          <TableCell>{(currentPage - 1) * itemsPerPage + i + 1}</TableCell>
                          <TableCell>{getDeliveryMemoStatus(row)}</TableCell>
                          <TableCell>{row.dmNumber}</TableCell>
                          <TableCell>{selectedDate ? selectedDate.toLocaleDateString() : new Date().toLocaleDateString()}</TableCell>
                          <TableCell>
                            <PartyCodeSelector
                              value={row.partyCode || null}
                              onChange={(partyCode) => handlePartyCodeSelect(row, partyCode)}
                              disabled={row.isDisabled || row.goodsCollectedUsername !== null}
                            />
                          </TableCell>
                          <TableCell>{row.medicalName}</TableCell>
                          <TableCell>{row.city}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                disabled={row.isDisabled || isLoading || row.goodsCollectedUsername !== null || !row.partyCode}
                                onClick={async () => await handleSave(row.dmNumber)}
                              >
                                Save
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={row.isDisabled || isLoading || row.goodsCollectedUsername === null}
                                  >
                                    Reset
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reset Delivery Memo</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reset this delivery memo {row.dmNumber}? This will clear all entered data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => await handleReset(row.dmNumber)}>Reset</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.goodsCollectedTimestamp ? tweleHrFormatDateString(row.goodsCollectedTimestamp) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>

                  {/* First page */}
                  {totalPages > 0 && (
                    <PaginationItem className={currentPage === 1 ? 'hidden sm:block' : ''}>
                      <PaginationLink
                        onClick={() => handlePageChange(1)}
                        isActive={currentPage === 1}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Left ellipsis */}
                  {currentPage > 3 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationLink className="cursor-default">...</PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Mobile: Show only current page */}
                  {currentPage !== 1 && currentPage !== totalPages && (
                    <PaginationItem className="sm:hidden">
                      <PaginationLink isActive>{currentPage}</PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Desktop: Show surrounding pages */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 5) return true;
                      return page === currentPage - 1 || page === currentPage || page === currentPage + 1;
                    })
                    .filter(page => page !== 1 && page !== totalPages)
                    .map((page) => (
                      <PaginationItem key={page} className="hidden sm:block">
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                  {/* Right ellipsis */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationLink className="cursor-default">...</PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Last page */}
                  {totalPages > 1 && (
                    <PaginationItem className={currentPage === totalPages ? 'hidden sm:block' : ''}>
                      <PaginationLink
                        onClick={() => handlePageChange(totalPages)}
                        isActive={currentPage === totalPages}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checking">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Checking</CardTitle>
                <div className="flex flex-col w-full md:w-auto gap-2 lg:flex-row md:flex-row">
                  <div className="w-full">
                    <Input
                      type="text"
                      placeholder="Search DM number..."
                      value={dmSearchTerm}
                      onChange={(e) => setDmSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <DatePicker date={selectedDate} setDate={setSelectedDate} />
                    <Button
                      variant={'outline'}
                      disabled={!selectedDate || moment(selectedDate).isSame(moment(), 'day')}
                      onClick={() => setSelectedDate(moment().startOf('day').toDate())}
                    >Clear Date</Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full border rounded-lg m-auto max-w-[100vw] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>DM No.</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Party Code</TableHead>
                      <TableHead>Medical Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Checked Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && deliveryMemos?.length === 0 ? (
                      <TableSkeleton rows={5} cols={11} />
                    ) : deliveryMemos.length === 0 ? (
                      <TableEmpty
                        text='No collected delivery memos to check'
                      />
                    ) : (
                      currentDeliveryMemos.map((row, i) => (
                        <TableRow key={row.dmNumber}
                          className={cn(
                            "border-gray-400",
                            lastInteractedDm === row.dmNumber && "border-[2px] border-yellow-300"
                          )}
                        >
                          <TableCell>{(currentPage - 1) * itemsPerPage + i + 1}</TableCell>
                          <TableCell>{getDeliveryMemoStatus(row)}</TableCell>
                          <TableCell>{row.dmNumber}</TableCell>
                          <TableCell>{selectedDate ? selectedDate.toLocaleDateString() : new Date().toLocaleDateString()}</TableCell>
                          <TableCell>{row.partyCode}</TableCell>
                          <TableCell>{row.medicalName}</TableCell>
                          <TableCell>{row.city}</TableCell>
                          <TableCell>
                            <TakeImage
                              deliveryMemo={row as any}
                              uploadingImage={uploadingImage}
                              handleImageUpload={handleImageUpload}
                              isDisabled={row.goodsCheckedUsername !== null || uploadingImage === row.dmNumber}
                              showImages={row.images || []}
                              takeType='BOTH'
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                disabled={isLoading || row.goodsCheckedUsername !== null || !row.images || row.images.length === 0}
                                onClick={async () => await handleCheck(row.dmNumber)}
                              >
                                Save
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLoading || row.goodsCheckedUsername === null}
                                  >
                                    Reset
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reset Delivery Memo</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reset this delivery memo {row.dmNumber}? This will clear all entered data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => await handleReset(row.dmNumber , true)}>Reset</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.goodsCheckedTimestamp ? tweleHrFormatDateString(row.goodsCheckedTimestamp) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>

                  {/* First page */}
                  {totalPages > 0 && (
                    <PaginationItem className={currentPage === 1 ? 'hidden sm:block' : ''}>
                      <PaginationLink
                        onClick={() => handlePageChange(1)}
                        isActive={currentPage === 1}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Left ellipsis */}
                  {currentPage > 3 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationLink className="cursor-default">...</PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Mobile: Show only current page */}
                  {currentPage !== 1 && currentPage !== totalPages && (
                    <PaginationItem className="sm:hidden">
                      <PaginationLink isActive>{currentPage}</PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Desktop: Show surrounding pages */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 5) return true;
                      return page === currentPage - 1 || page === currentPage || page === currentPage + 1;
                    })
                    .filter(page => page !== 1 && page !== totalPages)
                    .map((page) => (
                      <PaginationItem key={page} className="hidden sm:block">
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                  {/* Right ellipsis */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem className="hidden sm:block">
                      <PaginationLink className="cursor-default">...</PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Last page */}
                  {totalPages > 1 && (
                    <PaginationItem className={currentPage === totalPages ? 'hidden sm:block' : ''}>
                      <PaginationLink
                        onClick={() => handlePageChange(totalPages)}
                        isActive={currentPage === totalPages}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

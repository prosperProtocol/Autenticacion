export interface ActiveUsersResponse {
  Id: number;
  createdAt: string;
  updatedAt: string;
  memo: string | null;
  status: 'rejected' | 'approved' | 'active' | 'pending' | 'open' | 'incomplete';
  Person: {
    Id: number;
    FirstName?: string;
    LastName?: string;
    DocumentType?: string;
    DocumentNumber?: string;
    ProfilePictureBase64?: string | null;
    Address: {
      Street?: string;
      StreetNumber?: string;
      Zip?: string | number;
      City?: string;
      State?: string;
      Country?: string;
    };
    Emails: { address: string | null }[];  // email puede ser null
    Phones: { number: string | null }[];   // phoneNumber puede ser null
  };
}

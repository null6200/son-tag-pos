export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export interface Database {
    public: {
        Tables: {
            app_roles: {
                Row: {
                    id: string;
                    branch_id: string;
                    name: string;
                    permissions: string[];
                    archived: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    branch_id: string;
                    name: string;
                    permissions: string[];
                    archived?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    branch_id?: string;
                    name?: string;
                    permissions?: string[];
                    archived?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            branches: {
                Row: {
                    id: string;
                    name: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            customers: {
                Row: {
                    id: string;
                    branch_id: string;
                    name: string;
                    phone: string | null;
                    email: string | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    branch_id: string;
                    name: string;
                    phone?: string | null;
                    email?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    branch_id?: string;
                    name?: string;
                    phone?: string | null;
                    email?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            drafts: {
                Row: {
                    id: string;
                    branch_id: string;
                    section_id: string | null;
                    table_id: string | null;
                    name: string;
                    service_type: string;
                    waiter_id: string | null;
                    customer_name: string | null;
                    customer_phone: string | null;
                    cart: Json;
                    subtotal: number;
                    discount: number;
                    tax: number;
                    total: number;
                    status: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    branch_id: string;
                    section_id?: string | null;
                    table_id?: string | null;
                    name: string;
                    service_type: string;
                    waiter_id?: string | null;
                    customer_name?: string | null;
                    customer_phone?: string | null;
                    cart: Json;
                    subtotal: number;
                    discount: number;
                    tax: number;
                    total: number;
                    status: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    branch_id?: string;
                    section_id?: string | null;
                    table_id?: string | null;
                    name?: string;
                    service_type?: string;
                    waiter_id?: string | null;
                    customer_name?: string | null;
                    customer_phone?: string | null;
                    cart?: Json;
                    subtotal?: number;
                    discount?: number;
                    tax?: number;
                    total?: number;
                    status?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            profiles: {
                Row: {
                    id: string;
                    branch_id: string | null;
                    full_name: string | null;
                    avatar_url: string | null;
                };
                Insert: {
                    id: string;
                    branch_id?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                };
                Update: {
                    id?: string;
                    branch_id?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                };
            };
            sections: {
                Row: {
                    id: string;
                    name: string;
                    branch_id: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    branch_id: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    branch_id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            service_types: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    branch_id: string;
                    archived: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    branch_id: string;
                    archived?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    branch_id?: string;
                    archived?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            subcategories: {
                Row: {
                    id: string;
                    name: string;
                    code: string | null;
                    branch_id: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    code?: string | null;
                    branch_id?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    code?: string | null;
                    branch_id?: string | null;
                    created_at?: string;
                };
            };
            tables: {
                Row: {
                    id: string;
                    name: string;
                    section_id: string | null;
                    status: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    section_id?: string | null;
                    status: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    section_id?: string | null;
                    status?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            user_roles: {
                Row: {
                    user_id: string;
                    role_id: string;
                };
                Insert: {
                    user_id: string;
                    role_id: string;
                };
                Update: {
                    user_id?: string;
                    role_id?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            attendance_source: 'POS' | 'MANUAL';
            employment_status: 'ACTIVE' | 'INACTIVE';
        };
    };
}

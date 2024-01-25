'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';



const formSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer'
    }),
    amount: z.coerce.number()
    .gt(0, {message: 'Please enter an amount greate than $0'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.'
    }),
    date: z.string(),
})

const CreateInvoice = formSchema.omit({ id: true, date: true });

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };
   

export async function createInvoice(prevSate: State, formData: FormData) {
    try {
        const validatedFields = CreateInvoice.safeParse({
            customerId: formData.get('customerId'),
            amount: formData.get('amount'),
            status: formData.get('status'),
        });

        if(!validatedFields.success) {
            return {
                errors: validatedFields.error.flatten().fieldErrors,
                message: 'Missing fields. Failed to create invoice.'
            };
        }

        const { customerId, amount, status } = validatedFields.data;
        const amountInCents = amount * 100;
        const date = new Date().toISOString().split('T')[0];


        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;

    } catch (error) {
        console.log(error);
        return {
            message: 'Database Error: Failed to created invoice'
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');

}


const UpdateInvoice = formSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, prevState: State, formData: FormData) {

    try {

        const validatedFields = UpdateInvoice.safeParse({
            customerId: formData.get('customerId'),
            amount: formData.get('amount'),
            status: formData.get('status'),
        });

        if(!validatedFields.success) {
            return {
                errors: validatedFields.error.flatten().fieldErrors,
                message: 'Missing fields. Failed to update invoice.'
            };
        }

        const { customerId, amount, status } = validatedFields.data;
        const amountInCents = amount * 100;

        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;


    } catch (error) {
        console.log(error);
        return {
            message: 'Database Error: Failed to update invoice'
        }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {

    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
        return { message: 'Deleted Invoice.' };
    } catch (error) {
        console.log(error);
        return {
            message: 'Database Error: Failed to delete invoice'
        }
    }

}


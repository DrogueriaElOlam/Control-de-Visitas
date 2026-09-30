import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zqwjhmiavxhswgbgejzx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxd2pobWlhdnhoc3dnYmdlanp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzQ5MTEsImV4cCI6MjA3OTg1MDkxMX0.-FdEjQyGmuM6DVt58ciFmQoTzMKdvYW6prXHRp57UsQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

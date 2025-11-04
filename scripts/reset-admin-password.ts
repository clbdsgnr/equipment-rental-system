import { supabaseAdmin } from "../lib/supabase-server"

async function resetAdminPassword() {
  const email = "admin@admin.com"
  const newPassword = "123"

  try {
    console.log(`[v0] Searching for user with email: ${email}`)

    // First, get the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error("[v0] Error listing users:", listError)
      return
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      console.error(`[v0] User with email ${email} not found`)
      return
    }

    console.log(`[v0] Found user with ID: ${user.id}`)

    // Update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (error) {
      console.error("[v0] Error updating password:", error)
      return
    }

    console.log(`[v0] Password successfully updated for ${email}`)
    console.log(`[v0] New password: ${newPassword}`)
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
  }
}

// Execute the function
resetAdminPassword()

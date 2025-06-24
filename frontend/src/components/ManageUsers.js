import React, { useState } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import Layout from './Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BACKEND_URL = 'https://automated-hydroponic-monitoring-o8eti.ondigitalocean.app/hydroponic-webapp-backend';


function ManageUsers() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
  });

  // Fetch users with React Query v5 object form
  // This query fetches the list of users from the backend API
  // It uses the `useQuery` hook to manage the fetching state and caching
  // The query key is 'users' and the query function fetches data from the specified backend URL
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(`${BACKEND_URL}/api/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  
  // Create User Mutation
  // This mutation creates a new user by sending a POST request to the backend API
  // It takes the form data as input and expects a JSON response
  // On success, it invalidates the 'users' query to refresh the user list
  const createUser = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`${BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });


  // Update User Mutation
  // This mutation updates an existing user by sending a PUT request to the backend API
  // It takes the user ID and updated data as input
  // On success, it invalidates the 'users' query to refresh the user list
  const updateUser = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`${BACKEND_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });


  // Delete User Mutation
  // This mutation deletes a user by sending a DELETE request to the backend API
  // It takes the user ID as input
  // On success, it invalidates the 'users' query to refresh the user list
  
  const deleteUser = useMutation({
    mutationFn: async (userId) => {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });


  // Handle Edit User
  // This function sets the form data to the user being edited
  // It populates the form fields with the user's email, role, and leaves the password field empty
  // This allows the user to update their email and role without changing the password
  // If the user submits the form without entering a new password, the existing password remains unchanged
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
    });
  };


  // Handle Delete User
  // This function prompts the user for confirmation before deleting a user
  // If the user confirms, it calls the deleteUser mutation with the user's ID
  // If the deletion is successful, the user list is refreshed
  // If the user cancels, no action is taken
  // If the deletion fails, it throws an error
  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    deleteUser.mutate(userId);
  };


  // Handle Form Submission
  // This function handles the form submission for adding or updating a user
  // It prevents the default form submission behavior
  // If editingUser is set, it calls the updateUser mutation with the user's ID and form data
  // If editingUser is not set, it calls the createUser mutation with the form data
  // After submission, it resets the form data and clears the editingUser state
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingUser) {
      updateUser.mutate({ id: editingUser.id, data: formData });
    } else {
      createUser.mutate(formData);
    }
    setEditingUser(null);
    setFormData({ email: '', password: '', role: 'user' });
  };

  if (isLoading) return <div className="text-center mt-8 text-white">Loading...</div>;  // Show loading state while fetching users

  return (

    // Render the Manage Users page
    // This component displays a form for adding/editing users and a list of existing users
    // It uses the Layout component for consistent styling and structure
    // The form allows users to enter email, password, and role
    // The user list displays each user's email, role, and action buttons for editing and deleting
    // The form and user list are styled with Tailwind CSS classes for a modern look
    // The form is responsive and includes hover effects for better user experience
    // The user list is displayed in a table format with action buttons for each user
    <Layout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto bg-green-800 rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Manage Users</h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error.message}
            </div>
          )}

          {/* Add/Edit User Form */}
          <div className="bg-green-900 text-white p-6 rounded-lg mb-8 transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">     
              <div>
                <label className="block text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}    // Update the email field
                  className="w-full px-3 py-2 border rounded-lg text-gray-800"
                  required
                />
              </div>
              {(editingUser || !editingUser) && (
                <div>
                  <label className="block text-sm font-bold mb-2">Password{editingUser && ' (leave blank to keep unchanged)'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}   // Update the password field
                    className="w-full px-3 py-2 border rounded-lg text-gray-800"
                    minLength={editingUser ? 0 : 6}
                    placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                    required={!editingUser}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}   // Update the role field
                  className="w-full px-3 py-2 border rounded-lg text-gray-800"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg text-white"
                >
                  {editingUser ? 'Update User' : 'Add User'}
                </button>
                {editingUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);                                     // Clear the editing state
                      setFormData({ email: '', password: '', role: 'user' });   // Reset the form data
                    }}
                    className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Users List */}
          <div className="bg-green-900 text-white p-6 rounded-lg transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}    // Set the user to be edited
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}    // Call the delete function with the user's ID
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ManageUsers;
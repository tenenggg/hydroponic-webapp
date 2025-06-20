import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import Layout from './Layout';

const BACKEND_URL = 'https://your-backend-xyz.ondigitalocean.app'; // TODO: Replace with your actual backend URL after deployment

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
    });
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const response = await fetch(`${BACKEND_URL}/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to update user');
      } else {
        const response = await fetch(`${BACKEND_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to create user');
      }

      setEditingUser(null);
      setFormData({ email: '', password: '', role: 'user' });
      fetchUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) return <div className="text-center mt-8 text-white">Loading...</div>;

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto bg-green-800 rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Manage Users</h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                      setEditingUser(null);
                      setFormData({ email: '', password: '', role: 'user' });
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
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
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
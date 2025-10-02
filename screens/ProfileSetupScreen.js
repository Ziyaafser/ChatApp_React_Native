import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebase';

export default function ProfileSetupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      Alert.alert('You must be logged in first');
      navigation.replace('Login'); // redirect if not authenticated
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      Alert.alert('Username cannot be empty');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('You must be logged in');
      return;
    }

    setLoading(true);

    try {
      // ✅ Check if username is taken
      const q = query(
        collection(db, 'users'),
        where('username', '==', username.trim())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        Alert.alert('Username already taken');
        setLoading(false);
        return;
      }

      // ✅ Save profile to Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        username: username.trim(),
        email: auth.currentUser.email,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Profile saved!');
      // ✅ No need to navigate, App.js will handle redirect
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // App.js will redirect to LoginScreen
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Logout */}
      <View style={styles.header}>
        <Text style={styles.title}>Set Your Username</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Input */}
      <TextInput
        style={styles.input}
        placeholder="Enter a unique username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      {/* Save Button */}
      <Button
        title={loading ? 'Saving...' : 'Save'}
        onPress={handleSaveProfile}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});

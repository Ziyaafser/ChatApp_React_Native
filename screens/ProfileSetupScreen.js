import { signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
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
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebase';

export default function ProfileSetupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      Alert.alert('You must be logged in first');
      navigation.replace('Login');
      return;
    }

    const fetchProfile = async () => {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username || '');
        setFullName(data.fullName || '');
        setAvatarUrl(data.avatar || '');
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!username.trim() || !fullName.trim()) {
      Alert.alert('All fields are required');
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

      const takenByOther = querySnapshot.docs.some(
        (doc) => doc.id !== auth.currentUser.uid
      );
      if (takenByOther) {
        Alert.alert('Username already taken');
        setLoading(false);
        return;
      }

      // ✅ Save to Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(
        userRef,
        {
          username: username.trim(),
          fullName: fullName.trim(),
          email: auth.currentUser.email,
          avatar: avatarUrl.trim() || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert('Profile saved!');
      // 👉 App.js will notice Firestore doc exists and redirect to ChatList automatically
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Logout */}
      <View style={styles.header}>
        <Text style={styles.title}>Setup Profile</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Full Name */}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />

      {/* Username */}
      <TextInput
        style={styles.input}
        placeholder="Unique Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      {/* Avatar URL */}
      <TextInput
        style={styles.input}
        placeholder="Avatar URL (optional)"
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        autoCapitalize="none"
      />

      {/* Avatar Preview */}
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 15 }}
        />
      ) : null}

      {/* Save Button */}
      <Button
        title={loading ? 'Saving...' : 'Save Profile'}
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

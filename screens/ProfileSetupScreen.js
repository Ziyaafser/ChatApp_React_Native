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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>User Profile</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Profile avatar + name */}
      <View style={styles.profileSection}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={{ color: '#666', fontSize: 28 }}>👤</Text>
          </View>
        )}
        <Text style={styles.profileName}>
          {fullName || 'Your Name'}
        </Text>
        <Text style={styles.profileUsername}>
          @{username || 'username'}
        </Text>
      </View>

      {/* Inputs */}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Unique Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Avatar URL (optional)"
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        autoCapitalize="none"
      />

      {/* Save */}
      <Button
        title={loading ? 'Saving...' : 'Save Profile'}
        onPress={handleSaveProfile}
        disabled={loading}
      />

      {/* Action buttons */}
      <View style={styles.actionColumn}>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>Group Info</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>Chat Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logoutText: { color: '#fff', fontWeight: 'bold' },

  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 8,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  profileName: { fontSize: 18, fontWeight: '600' },
  profileUsername: { fontSize: 14, color: '#666' },

    actionColumn: {
    marginTop: 20,
  },
    actionBtn: {
      backgroundColor: '#fff',       
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 12,

      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,

      elevation: 3,
    },
    actionText: {
      color: '#333',   
      fontWeight: 'bold',
      fontSize: 16,
    },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});

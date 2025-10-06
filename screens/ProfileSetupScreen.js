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
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { auth, db } from '../firebase';

export default function ProfileSetupScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

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
      const q = query(collection(db, 'users'), where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);

      const takenByOther = querySnapshot.docs.some((doc) => doc.id !== auth.currentUser.uid);
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

  // 🎨 Define colors based on theme
  const colors = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    primaryText: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#BBBBBB' : '#999999',
    inputBorder: isDarkMode ? '#2A2A2A' : '#ccc',
    cardBackground: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    accent: '#3483FA',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primaryText }]}>User Profile</Text>
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
            <Text style={{ color: colors.secondaryText, fontSize: 28 }}>👤</Text>
          </View>
        )}
        <Text style={[styles.profileName, { color: colors.primaryText }]}>
          {fullName || 'Your Name'}
        </Text>
        <Text style={[styles.profileUsername, { color: colors.secondaryText }]}>
          @{username || 'username'}
        </Text>
      </View>

      {/* Inputs */}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.primaryText,
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
          },
        ]}
        placeholder="Full Name"
        placeholderTextColor={colors.secondaryText}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.primaryText,
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
          },
        ]}
        placeholder="Unique Username"
        placeholderTextColor={colors.secondaryText}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.primaryText,
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
          },
        ]}
        placeholder="Avatar URL (optional)"
        placeholderTextColor={colors.secondaryText}
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        autoCapitalize="none"
      />

      {/* Save */}
      <TouchableOpacity
        onPress={handleSaveProfile}
        disabled={loading}
        style={[
          styles.saveBtn,
          { backgroundColor: loading ? '#999' : colors.accent },
        ]}
      >
        <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Profile'}</Text>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.actionColumn}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.actionText, { color: colors.primaryText }]}>Group Info</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.actionText, { color: colors.primaryText }]}>Chat Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

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
  profileUsername: { fontSize: 14 },

  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 15,
    borderRadius: 6,
    fontSize: 15,
  },

  saveBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
  },
  saveText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  actionColumn: {
    marginTop: 20,
  },
  actionBtn: {
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
    fontWeight: 'bold',
    fontSize: 16,
  },
});

import { Ionicons } from '@expo/vector-icons';
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
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { auth, db } from '../firebase';

export default function ProfileSetupScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [editable, setEditable] = useState(false);

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupList, setGroupList] = useState([]);

  const currentUser = auth.currentUser;

  const colors = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    primaryText: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#BBBBBB' : '#999999',
    inputBorder: isDarkMode ? '#2A2A2A' : '#ccc',
    cardBackground: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    accent: '#3483FA',
  };

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('You must be logged in first');
      navigation.replace('Login');
      return;
    }

    const fetchProfile = async () => {
      const userRef = doc(db, 'users', currentUser.uid);
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

  const fetchUserGroups = async () => {
    const q = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    const querySnapshot = await getDocs(q);
    const groups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGroupList(groups);
  };

  const handleSaveProfile = async () => {
    if (!username.trim() || !fullName.trim()) {
      Alert.alert('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);
      const takenByOther = querySnapshot.docs.some((doc) => doc.id !== currentUser.uid);
      if (takenByOther) {
        Alert.alert('Username already taken');
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userRef,
        {
          username: username.trim(),
          fullName: fullName.trim(),
          email: currentUser.email,
          avatar: avatarUrl.trim() || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setEditable(false);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primaryText }]}>User Profile</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setEditable(!editable)} style={{ marginRight: 12 }}>
            <Ionicons name={editable ? 'close' : 'create-outline'} size={24} color={colors.primaryText} />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Profile Info */}
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

      {/* Editable Inputs */}
      {editable && (
        <>
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
        </>
      )}

      {/* Action buttons */}
      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.cardBackground }]}
          onPress={async () => {
            await fetchUserGroups();
            setGroupModalVisible(true);
          }}
        >
          <Text style={[styles.actionText, { color: colors.primaryText }]}>Group Info</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.actionText, { color: colors.primaryText }]}>Chat Settings</Text>
        </TouchableOpacity> */}
      </View>

        <TouchableOpacity
        onPress={handleLogout}
        style={[styles.logoutBtnBottom]}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Logout</Text>
       </TouchableOpacity>


      {/* Group Info Modal */}
      <Modal visible={groupModalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Your Groups</Text>
            <FlatList
              data={groupList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Text style={{ color: colors.primaryText, paddingVertical: 6 }}>
                  • {item.name ? item.name : `Unnamed Group (${item.id})`}
                </Text>
              )}
            />
            <TouchableOpacity onPress={() => setGroupModalVisible(false)} style={styles.closeModalBtn}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    elevation: 3,
  },
  actionText: {
    fontWeight: 'bold',
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '60%',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  closeModalBtn: {
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: '#3483FA',
    borderRadius: 6,
    alignItems: 'center',
  },

  logoutBtnBottom: {
  fontWeight: 'heavy',
  backgroundColor: '#ff4d4d',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
},

});

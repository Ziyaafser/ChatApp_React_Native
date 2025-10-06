import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { auth, db } from '../firebase';

export default function CreateGroupScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const colors = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    primaryText: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#BBBBBB' : '#999999',
    border: isDarkMode ? '#2A2A2A' : '#aaa',
    card: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    selectedCard: isDarkMode ? '#3A3A3A' : '#e6f0ff',
    accent: '#3483FA',
    placeholderText: isDarkMode ? '#888' : '#999',
  };

  const [groupName, setGroupName] = useState('');
  const [groupAvatarUrl, setGroupAvatarUrl] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userList = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.id !== currentUser.uid);
      setUsers(userList);
    };

    fetchUsers();
  }, []);

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Enter group name');
      return;
    }
    if (selectedUserIds.length === 0) {
      Alert.alert('Select at least one member');
      return;
    }

    try {
      const newGroup = {
        name: groupName.trim(),
        members: [currentUser.uid, ...selectedUserIds],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        avatar: groupAvatarUrl,
      };

      await addDoc(collection(db, 'groups'), newGroup);
      Alert.alert('Group created!');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error creating group');
    }
  };

  const renderUser = ({ item }) => {
    const isSelected = selectedUserIds.includes(item.id);

    return (
      <TouchableOpacity
        onPress={() => toggleUserSelection(item.id)}
        style={[
          styles.userCard,
          { borderColor: colors.border },
          isSelected && { backgroundColor: colors.selectedCard },
        ]}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.placeholder,
              { backgroundColor: colors.border },
            ]}
          >
            <Text style={{ color: '#fff' }}>👤</Text>
          </View>
        )}
        <View>
          <Text style={[styles.name, { color: colors.primaryText }]}>
            {item.fullName || 'Unnamed'}
          </Text>
          <Text style={[styles.username, { color: colors.secondaryText }]}>
            @{item.username}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.primaryText }]}>
        Create New Group
      </Text>

      <TextInput
        placeholder="Enter group name"
        placeholderTextColor={colors.secondaryText}
        value={groupName}
        onChangeText={setGroupName}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.primaryText,
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
          },
        ]}
      />

      <TextInput
        placeholder="Enter avatar image URL (optional)"
        placeholderTextColor={colors.secondaryText}
        value={groupAvatarUrl}
        onChangeText={setGroupAvatarUrl}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.primaryText,
            backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
          },
        ]}
      />

      {groupAvatarUrl ? (
        <Image source={{ uri: groupAvatarUrl }} style={styles.groupImage} />
      ) : (
        <Text
          style={{
            color: colors.secondaryText,
            marginBottom: 10,
            textAlign: 'center',
          }}
        >
          No group image preview
        </Text>
      )}

      <Text style={[styles.subheading, { color: colors.primaryText }]}>
        Select Members
      </Text>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handleCreateGroup}
      >
        <Text style={styles.buttonText}>Create Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  subheading: { fontSize: 16, marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: 0.5,
    borderRadius: 6,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16 },
  username: { fontSize: 13 },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  buttonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
});

import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
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

export default function GroupInfoScreen({ route, navigation }) {
  const { groupId } = route.params;
  const currentUser = auth.currentUser;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [groupData, setGroupData] = useState(null);
  const [members, setMembers] = useState([]);
  const [groupImage, setGroupImage] = useState(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const colors = {
    background: isDarkMode ? '#121212' : '#FFFFFF',
    primaryText: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#BBBBBB' : '#999999',
    border: isDarkMode ? '#2A2A2A' : '#ccc',
    accent: '#3483FA',
    danger: '#ff5252',
    card: isDarkMode ? '#2A2A2A' : '#FFFFFF',
    adminBadge: isDarkMode ? '#3A3A3A' : '#a7a7a7ff',
  };

  useEffect(() => {
    fetchGroupInfo();
  }, []);

  const fetchGroupInfo = async () => {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
      const data = groupSnap.data();
      setGroupData(data);
      setGroupImage(data.avatar || '');

      const memberProfiles = [];
      for (const uid of data.members) {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
          memberProfiles.push({ id: uid, ...userSnap.data() });
        }
      }
      setMembers(memberProfiles);
    }
  };

  const handleUpdateImageUrl = async () => {
    if (!newImageUrl.trim()) {
      Alert.alert('Error', 'URL cannot be empty.');
      return;
    }

    try {
      await updateDoc(doc(db, 'groups', groupId), { avatar: newImageUrl });
      setGroupImage(newImageUrl);
      setShowUrlModal(false);
      fetchGroupInfo();
      Alert.alert('Success', 'Group picture updated.');
    } catch (err) {
      console.error('Error updating image URL:', err);
      Alert.alert('Error', 'Failed to update group picture.');
    }
  };

  const removeImage = async () => {
    await updateDoc(doc(db, 'groups', groupId), { avatar: '' });
    setGroupImage('');
    fetchGroupInfo();
    Alert.alert('Removed', 'Group picture removed.');
  };

  const leaveGroup = async () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const updatedMembers = groupData.members.filter((uid) => uid !== currentUser.uid);
          await updateDoc(doc(db, 'groups', groupId), { members: updatedMembers });
          Alert.alert('You left the group');
          navigation.goBack();
        },
      },
    ]);
  };

  const deleteGroup = async () => {
    Alert.alert('Delete Group', 'This will permanently delete the group. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'groups', groupId));
            Alert.alert('Group Deleted');
            navigation.goBack();
          } catch (err) {
            console.error('Error deleting group:', err);
            Alert.alert('Error', 'Failed to delete group.');
          }
        },
      },
    ]);
  };

  const renderMember = ({ item }) => {
    const isAdmin = item.id === groupData.createdBy;
    return (
      <View style={[styles.memberCard, { borderColor: colors.border }]}>
        <Image
          source={{
            uri: item.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
          }}
          style={styles.memberAvatar}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.memberName, { color: colors.primaryText }]}>
              {item.fullName || 'Unnamed'}
            </Text>
            {isAdmin && (
              <View style={[styles.adminBadge, { backgroundColor: colors.adminBadge }]}>
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberUsername, { color: colors.secondaryText }]}>
            @{item.username}
          </Text>
        </View>
      </View>
    );
  };

  if (!groupData) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.groupName, { color: colors.primaryText }]}>{groupData.name}</Text>

      <View style={{ alignItems: 'center' }}>
        <Image
          source={{
            uri: groupImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
          }}
          style={styles.groupImage}
        />
      </View>

      <View style={styles.imageActions}>
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.accent }]} onPress={() => setShowUrlModal(true)}>
          <Text style={styles.editText}>Change</Text>
        </TouchableOpacity>
        {groupImage ? (
          <TouchableOpacity style={[styles.removeBtn, { backgroundColor: colors.card }]} onPress={removeImage}>
            <Text style={[styles.removeText, { color: colors.primaryText }]}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Members</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={{ paddingBottom: 160 }}
      />

      <TouchableOpacity style={[styles.leaveBtn, { backgroundColor: colors.danger }]} onPress={leaveGroup}>
        <Text style={styles.leaveText}>Leave Group</Text>
      </TouchableOpacity>

      {groupData.createdBy === currentUser.uid && (
        <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: '#000' }]} onPress={deleteGroup}>
          <Text style={styles.deleteText}>Delete Group</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showUrlModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Enter Image URL</Text>
            <TextInput
              value={newImageUrl}
              onChangeText={setNewImageUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.secondaryText}
              style={[
                styles.urlInput,
                {
                  borderColor: colors.border,
                  color: colors.primaryText,
                  backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
                },
              ]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setShowUrlModal(false)}>
                <Text style={{ marginRight: 20, color: colors.secondaryText }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateImageUrl}>
                <Text style={{ color: colors.accent, fontWeight: 'bold' }}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  groupImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: 10,
    marginBottom: 10,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editText: { color: '#fff', fontWeight: 'bold' },
  removeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeText: { fontWeight: 'bold' },
  groupName: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20 },
  memberName: { fontSize: 16 },
  memberUsername: { fontSize: 12 },
  leaveBtn: {
    position: 'absolute',
    bottom: 70,
    left: 20,
    right: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  leaveText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  deleteText: { textAlign: 'center', color: '#fff', fontWeight: 'bold' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000000aa',
    padding: 20,
  },
  modalBox: { padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  urlInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  adminBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

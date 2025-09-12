import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface NotaUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (notaPhotos: any[]) => void;
  isLoading?: boolean;
}

const NotaUploadModal: React.FC<NotaUploadModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [notaPhotos, setNotaPhotos] = useState<any[]>([]);

  const handleImagePicker = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const file = target.files[0];
          setNotaPhotos(prev => [
            ...prev,
            {
              uri: URL.createObjectURL(file),
              name: file.name,
              type: file.type,
            },
          ]);
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Pilih Foto Nota",
        "Bagaimana cara Anda ingin mengambil foto?",
        [
          { 
            text: "Kamera", 
            onPress: takePicture 
          },
          { 
            text: "Galeri", 
            onPress: pickFromGallery 
          },
          { 
            text: "Batal", 
            style: "cancel" 
          },
        ],
        { cancelable: true }
      );
    }
  };

  const takePicture = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Error", "Permission to access camera was denied");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        // ✅ Append new photo to existing array
        setNotaPhotos(prev => [...prev, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take picture");
    }
  };

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Error", "Permission to access gallery was denied");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setNotaPhotos(prev => [...prev, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleConfirm = () => {
    if (notaPhotos.length === 0) {
      Alert.alert("Error", "Silakan pilih foto nota terlebih dahulu");
      return;
    }
    onConfirm(notaPhotos);
  };

  const removePhoto = (index: number) => {
    setNotaPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setNotaPhotos([]);
    onClose();
  };

  // Reset photos when modal closes
  useEffect(() => {
    if (!visible) {
      setNotaPhotos([]);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollContainer}>
            <Text style={styles.modalTitle}>Upload Foto Nota</Text>
            <Text style={styles.modalSubtitle}>
              Silakan ambil foto nota dari pelanggan sebagai bukti penyerahan barang
            </Text>

            {/* Photo Upload Section */}
            <View style={styles.photoSection}>
              {/* Add Photo Button */}
              <TouchableOpacity style={styles.addPhotoButton} onPress={handleImagePicker}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Tambah Foto Nota</Text>
              </TouchableOpacity>

              {/* Display Selected Photos */}
              {notaPhotos.length > 0 && (
                <View style={styles.photosContainer}>
                  <Text style={styles.photosTitle}>
                    Foto Nota ({notaPhotos.length} foto{notaPhotos.length > 1 ? '' : ''})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                    {notaPhotos.map((photo, index) => (
                      <View key={index} style={styles.photoItem}>
                        <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removePhoto(index)}
                        >
                          <Text style={styles.removePhotoText}>❌</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  (notaPhotos.length === 0 || isLoading) && styles.disabledButton,
                ]}
                onPress={handleConfirm}
                disabled={notaPhotos.length === 0 || isLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {isLoading ? "Mengunggah..." : "Konfirmasi & Lanjutkan"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  scrollContainer: {
    maxHeight: '100%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  photoSection: {
    marginBottom: 30,
  },
  addPhotoButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginBottom: 15,
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  addPhotoText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  photosContainer: {
    marginTop: 15,
  },
  photosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  photosScrollView: {
    maxHeight: 120,
  },
  photoItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 5,
  },
  removePhotoButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
  },
  removePhotoText: {
    fontSize: 12,
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default NotaUploadModal;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Toast from './Toast';

function PlantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [newComment, setNewComment] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [quantity, setQuantity] = useState(() => {
    const savedQuantity = localStorage.getItem(`plant-${id}-quantity`);
    return savedQuantity ? parseInt(savedQuantity, 10) : 1;
  });
  const [comments, setComments] = useState([
    {
      id: 1,
      author: 'Sarah',
      date: '2024-03-15',
      content: 'This plant has been thriving in my living room! The care instructions were spot on.'
    }
  ]);

  // This would typically come from an API or database
  const plants = {
    1: {
      id: 1,
      name: 'Lavender Mist',
      commonName: 'French Meadow Rue',
      latinName: 'Thalictrum rochebruneanum',
      price: 10,
      images: ['/images/LavenderMist.jpg'],
      description: 'Magnificent sprays of delicate, lavender-purple flowers appear on tall, dark purple stems from mid thru late summer. Loose sprays of small, lavender-pink flowers with hanging, yellow stamens are produced in summer. This variety is self-supporting and is less likely to need staking than others. The distinctive green foliage forms a nice, low mound. Leaves resemble Columbine, but never get leaf miner, so they remain attractive all summer! Thalictrums are quite adaptable and grow from full sun to part shade. Excellent cut flower.',
      bloomSeason: 'Mid Summer, Late Summer (June-July)',
      colour: 'Pink, White',
      light: 'Full Sun, Partial Shade very adaptable',
      spacing: '20 in, 50 cm',
      attributes: 'Deer Resistant',
      hardinessZone: '4 - 8',
      height: '60 in, 150 cm'
    },
    2: {
      id: 2,
      name: "Palmer's Beardtongue",
      commonName: 'Palmer Penstemon, Pink Wild Snapdragon, Scented Penstemon',
      latinName: 'Penstemon palmeri',
      price: 10,
      images: [
        '/images/penstemonpalmeri.jpg',
        '/images/penstemonpalmeri2.jpg',
        '/images/penstemonpalmeri3.jpg',
        '/images/penstemonpalmeri4.jpg',
        '/images/penstemonpalmeri5.jpg'
      ],
      description: 'This is the gorgeous plant that most Flower Farmers grow as they make such unique stems for bouquet work. It\'s another plant that required cold germination from last November and then once they germinated I community sowed them, and then once they had 2 sets of leaves I pot on.\n\nWith stalks up to six feet tall, this Southwest hardy penstemon has huge fragrant, light pink flowers blooming from May to July. The fragrant flowers smell like grapes and attract hummingbirds and bumblebees. Very nice for cutting and it\'s a native to the Western United States!\n\nPenstemon palmeri is heat and drought tolerant, requiring full sun and well-drained soil. It\'s one of the showiest penstemons you can grow, making it perfect for both garden displays and cut flower arrangements.',
      bloomSeason: 'May to July',
      colour: 'Light pink',
      light: 'Full Sun',
      spacing: '15 inches',
      attributes: 'Native, Deer Resistant, Drought Tolerant, Fragrant (grape scented), Perfect for Cutting, Attracts Hummingbirds and Bumblebees',
      hardinessZone: '4 - 9',
      height: '3-4 feet (up to 6 feet)'
    },
    3: {
      id: 3,
      name: 'Peace Lily',
      price: 20,
      images: [
        '/images/PeaceLily.jpg',
        '/images/PeaceLily2.jpg'
      ],
      description: 'An elegant plant with glossy leaves and white flowers. Excellent for improving indoor air quality.',
      care: 'Water when top soil is dry, prefers low to medium light.',
      height: '24-36 inches',
      spread: '24-36 inches',
      features: [
        'Air-purifying',
        'Beautiful white blooms',
        'Low light tolerant',
        'Easy care'
      ]
    },
    4: {
      id: 4,
      name: 'Gaillardia Pulchella Mix',
      commonName: 'Indian Blanket, Firewheel, Blanketflower',
      latinName: 'Gaillardia pulchella',
      price: 6,
      images: [
        '/images/gaillardiapulchella.jpg',
        '/images/gaillardiapulchella2.jpg'
      ],
      description: 'Gaillardia pulchella, commonly known as Indian blanket, firewheel, or blanketflower, is a wildflower native to North and South America.\n\n' +
        'The flowers have a striking daisy-like appearance with a dark red or brown central disk surrounded by ray florets. The petals range in color from yellow to orange, pink, or red, creating a vibrant display.\n\n' +
        'The plant has deeply lobed, hairy leaves that add to its overall attractiveness. The green foliage forms an attractive base for the colorful blooms.\n\n' +
        'Well-adapted to prairies, meadows, and open woodlands, this plant produces eye-catching flowers from late spring through early fall.\n\n' +
        'Indian blanket flowers hold cultural significance in Native American traditional medicine.\n\n' +
        'Easy to grow in well-drained soil and full sunlight. Known for drought tolerance and resilience in various climates.\n\n' +
        'A pollinator favorite - attracts bees and butterflies, contributing to garden biodiversity.',
      bloomSeason: 'Late Spring through Early Fall',
      colour: 'Yellow, Orange, Pink, Red with Dark Red/Brown Center',
      light: 'Full Sun',
      spacing: 'Sold as 2 plants per pot',
      attributes: 'Native, Drought Tolerant, Attracts Pollinators, Easy to Grow',
      hardinessZone: 'Hardy Annual',
      height: '30-60 cm'
    }
  };

  const plant = plants[id];

  const plantIds = Object.keys(plants).map(Number);
  const currentIndex = plantIds.indexOf(Number(id));
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < plantIds.length - 1;

  const handleNavigation = (direction) => {
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < plantIds.length) {
      navigate(`/plant/${plantIds[newIndex]}`);
      window.scrollTo(0, 0);
    }
  };

  const NavigationButtons = ({ className }) => (
    <div className={`plant-navigation ${className}`}>
      <div className="navigation-container">
        <Link to="/shop" className="nav-button">Back</Link>
        <div className="nav-group">
          <button
            className="nav-button"
            onClick={() => handleNavigation('prev')}
            disabled={!hasPrevious}
          >
            Previous
          </button>
          <span className="nav-separator">|</span>
          <button
            className="nav-button"
            onClick={() => handleNavigation('next')}
            disabled={!hasNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  // Clear quantity when component unmounts
  useEffect(() => {
    return () => {
      if (!localStorage.getItem(`plant-${id}-quantity`)) {
        localStorage.setItem(`plant-${id}-quantity`, '1');
      }
    };
  }, [id]);

  if (!plant) {
    return <div>Plant not found</div>;
  }

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: comments.length + 1,
      author: 'Guest',
      date: new Date().toISOString().split('T')[0],
      content: newComment.trim()
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  const handleQuantityChange = (delta) => {
    setQuantity(prev => {
      const newQuantity = Math.max(1, prev + delta);
      localStorage.setItem(`plant-${id}-quantity`, newQuantity.toString());
      return newQuantity;
    });
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(plant);
    }
    setToastMessage(`${quantity} ${quantity === 1 ? 'item has' : 'items have'} been added to your cart`);
    setShowToast(true);
    setQuantity(1);
    localStorage.setItem(`plant-${id}-quantity`, '1');
  };

  return (
    <main>
      <NavigationButtons className="top" />
      <div className="plant-details">
        <div className="plant-details-container">
          <div className="plant-details-gallery">
            <div className="plant-details-image">
              <img src={plant.images[selectedImageIndex]} alt={plant.name} />
            </div>
            {plant.images.length > 1 && (
              <div className="image-thumbnails">
                {plant.images.map((image, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={image} alt={`${plant.name} view ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="plant-details-info">
            <h1>{plant.name}</h1>
            {plant.commonName && plant.latinName && (
              <p className="plant-names">
                {plant.commonName} <span className="latin-name">({plant.latinName})</span>
              </p>
            )}
            <div className="price-action-container">
              <p className="price">${plant.price}</p>
              <div className="quantity-selector">
                <button onClick={() => handleQuantityChange(-1)}>-</button>
                <span>{quantity}</span>
                <button onClick={() => handleQuantityChange(1)}>+</button>
              </div>
              <button 
                className="plant-buy"
                onClick={handleAddToCart}
              >
                Buy
              </button>
            </div>
            <p className="description">{plant.description}</p>
            <div className="plant-specs">
              <h3>Plant Specifications</h3>
              <p><strong>Bloom Season:</strong> {plant.bloomSeason}</p>
              <p><strong>Colour:</strong> {plant.colour}</p>
              <p><strong>Light:</strong> {plant.light}</p>
              <p><strong>Spacing:</strong> {plant.spacing}</p>
              <p><strong>Attributes:</strong> {plant.attributes}</p>
              <p><strong>Hardiness Zone:</strong> {plant.hardinessZone}</p>
              <p><strong>Height:</strong> {plant.height}</p>
            </div>
          </div>
        </div>

        <div className="comments-section">
          <h2>Customer Comments</h2>
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your comment..."
              required
            />
            <button type="submit">Post Comment</button>
          </form>

          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span>{comment.author}</span>
                  <span>{comment.date}</span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NavigationButtons className="bottom" />
      {showToast && (
        <Toast 
          message={toastMessage} 
          onClose={() => setShowToast(false)} 
        />
      )}
    </main>
  );
}

export default PlantDetails; 